/**
 * hunt.codes /api — the drawing robot's mission control.
 *
 * One Lambda (Function URL behind CloudFront `/api/*`) serving:
 *   POST /api/draw            — generate + persist a drawing
 *   GET  /api/drawings        — recent drawings for the gallery
 *   GET  /api/drawings/{id}   — one drawing (permalink)
 *
 * Design notes:
 * - The OpenAI key lives in SSM SecureString `/hunt-codes/openai-api-key`;
 *   it is fetched once per container and never logged.
 * - Every prompt (and name) passes OpenAI's free moderation endpoint
 *   BEFORE touching a billable model — flagged input never reaches
 *   gpt-4o, which is what keeps the OpenAI account in good standing.
 *   Completions also carry a hashed-IP `user` identifier so any abuse
 *   that slips through is attributed to the end user, not the account.
 * - Abuse guards: per-viewer hourly limit + global daily budget, both
 *   plain DynamoDB counters with TTL. Fail closed on moderation errors.
 * - Generated SVG is checked against a tag/attribute allowlist before
 *   storage. This is defense in depth, NOT the XSS gate: the browser
 *   renders every stored drawing inside an inert `<img>` data URI
 *   (see src/SvgGenerator.tsx), where scripts never run, event handlers
 *   never fire, and CSS cannot reach the host page. An earlier version
 *   inlined the markup and leaned on this allowlist alone — regexes
 *   cannot safely parse untrusted markup (unquoted attributes and
 *   quote desync both slipped event handlers past it), which is why
 *   isolation now carries the security weight.
 * - CloudFront rewrites 403/404 to the SPA's index.html, so "not found"
 *   is a 410 here (the one status CloudFront leaves alone).
 */

import { createHash, randomBytes } from "node:crypto";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const TABLE_NAME = process.env.TABLE_NAME || "hunt-codes-draw";
const OPENAI_KEY_PARAM =
  process.env.OPENAI_KEY_PARAM || "/hunt-codes/openai-api-key";
const PER_IP_HOURLY_LIMIT = Number(process.env.PER_IP_HOURLY_LIMIT || 10);
const DAILY_GLOBAL_LIMIT = Number(process.env.DAILY_GLOBAL_LIMIT || 150);
const GENERATION_MODEL = process.env.GENERATION_MODEL || "gpt-4o";

const NAME_MAX = 40;
const PROMPT_MAX = 300;
const SVG_MAX_BYTES = 150_000; // DynamoDB item ceiling is 400KB; stay well under
const GALLERY_LIMIT = 12;

// Same artist brief the frontend used when the key was browser-side.
const SYSTEM_PROMPT = `You are an SVG artist. Create a beautiful, clean SVG illustration based on the user's description.

Rules:
- Return ONLY valid SVG markup, no explanation, no markdown code fences, no other text
- Use viewBox="0 0 400 400"
- Prefer <path> elements with explicit stroke attributes for optimal drawing animation
- Use vibrant, appealing colors that look good on a dark (#000) background
- Keep the design clean, minimal, and recognizable
- Set stroke-width between 2-4px
- Include both stroke and fill on path elements where appropriate
- Make the illustration detailed enough to be interesting but not overly complex
- Do NOT use <text> elements`;

const ddb = new DynamoDBClient({});
const ssm = new SSMClient({});

let cachedOpenAiKey = null;
const getOpenAiKey = async () => {
  if (cachedOpenAiKey) return cachedOpenAiKey;
  try {
    const res = await ssm.send(
      new GetParameterCommand({ Name: OPENAI_KEY_PARAM, WithDecryption: true }),
    );
    cachedOpenAiKey = res.Parameter?.Value || null;
  } catch (err) {
    // ParameterNotFound before the key is set — report "not wired up"
    // instead of a generic 500
    if (err?.name !== "ParameterNotFound") throw err;
    cachedOpenAiKey = null;
  }
  return cachedOpenAiKey;
};

/**
 * Drop the cached key so the next request re-reads SSM. Called when
 * OpenAI rejects it: without this, rotating the key leaves warm
 * containers presenting the revoked one until they happen to recycle,
 * and the site half-fails for however long that takes.
 */
const forgetOpenAiKey = () => {
  cachedOpenAiKey = null;
};

const json = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders,
  },
  body: JSON.stringify(body),
});

// Static salt: this is a privacy nicety (no raw IPs at rest), not a secret.
const hashIp = (ip) =>
  createHash("sha256").update(`hunt-codes-draw|${ip}`).digest("hex").slice(0, 16);

/**
 * A rate-limit key for the visitor that the visitor cannot choose.
 *
 * Explicitly NOT `x-forwarded-for`. Behind a Function URL, Lambda passes
 * through only the LEFTMOST XFF value and CloudFront's appended real
 * viewer IP is dropped before the handler runs. Verified against the live
 * stack: a request carrying `X-Forwarded-For: 1.1.1.1, 2.2.2.2` arrives
 * as `1.1.1.1`, while a request sending no XFF arrives with the genuine
 * viewer IP. Reading any part of that header therefore hands the caller
 * their own rate-limit bucket — vary it per request and the hourly limit
 * (and the OpenAI `user` safety identifier) resets every time.
 *
 * `CloudFront-Viewer-Address` is generated by CloudFront and overwrites
 * any viewer-supplied copy, so it IS trustworthy — but it only reaches
 * the origin if the origin request policy forwards it, and the current
 * AllViewerExceptHostHeader policy does not. Until that changes this
 * falls back to `sourceIp`, which behind OAC is the edge POP: coarser
 * than per-visitor, but not forgeable. See server/README.md.
 */
const viewerIp = (event) => {
  const address = event.headers?.["cloudfront-viewer-address"];
  if (address) {
    // "198.51.100.10:46532", or "[2001:db8::1]:46532" for IPv6
    const bracketed = address.match(/^\[(.+)\]:\d+$/);
    if (bracketed) return bracketed[1];
    const lastColon = address.lastIndexOf(":");
    // Strip a trailing :port only for IPv4 — a bare IPv6 is all colons
    if (lastColon > 0 && address.indexOf(":") === lastColon) {
      return address.slice(0, lastColon);
    }
    return address;
  }
  return event.requestContext?.http?.sourceIp || "unknown";
};

/**
 * Increment a TTL'd counter and return the new count. One item per
 * (key, time bucket); DynamoDB's ADD is atomic so concurrent requests
 * can't sneak past the limit.
 */
const bumpCounter = async (pk, ttlSeconds) => {
  const res = await ddb.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: { pk: { S: pk } },
      UpdateExpression:
        "ADD n :one SET expiresAt = if_not_exists(expiresAt, :exp)",
      ExpressionAttributeValues: {
        ":one": { N: "1" },
        ":exp": { N: String(Math.floor(Date.now() / 1000) + ttlSeconds) },
      },
      ReturnValues: "UPDATED_NEW",
    }),
  );
  return Number(res.Attributes?.n?.N || "0");
};

// ---------------------------------------------------------------------------
// SVG screening — an allowlist, and explicitly NOT the XSS boundary.
// Regexes cannot parse untrusted markup safely: an earlier revision of
// this file was defeated by unquoted attributes (`onbegin=alert(1)`) and
// by quote desync (`<desc>x="</desc>` swallowing the next start tag), in
// both cases smuggling a live SMIL event handler past the scan. The real
// gate is the renderer: drawings are served into an inert `<img>` data
// URI where no handler can fire. This screen keeps junk out of the table
// and rejects rather than sanitizes — the user simply regenerates.
// ---------------------------------------------------------------------------

// `style` is deliberately absent: CSS inside an inline SVG is not scoped
// to the SVG, so a stored drawing could restyle the host page. `text` and
// friends are absent too — the system prompt forbids them, and a public
// gallery that renders arbitrary words is a spam billboard that prompt
// moderation does not police.
const ALLOWED_TAGS = new Set(
  [
    "svg", "g", "path", "circle", "ellipse", "line", "polyline", "polygon",
    "rect", "defs", "linearGradient", "radialGradient", "stop", "clipPath",
    "mask", "pattern", "symbol", "use", "marker", "animate",
    "animateTransform", "animateMotion", "mpath", "set", "filter",
    "feGaussianBlur", "feOffset", "feBlend", "feColorMatrix", "feComposite",
    "feDropShadow", "feFlood", "feMerge", "feMergeNode", "feMorphology",
    "feTurbulence", "feDisplacementMap", "feComponentTransfer", "feFuncR",
    "feFuncG", "feFuncB", "feFuncA", "feSpecularLighting",
    "feDiffuseLighting", "feDistantLight", "fePointLight", "feSpotLight",
    "feTile",
  ].map((t) => t.toLowerCase()),
);

// Substrings that have no business in a decorative SVG, case-insensitive.
const FORBIDDEN_PATTERNS = [
  /<script/i,
  /<foreignobject/i,
  /<iframe/i,
  /<embed/i,
  /<object/i,
  /<image/i,
  /<feimage/i,
  /<style/i,
  /<!doctype/i,
  /<!entity/i,
  /<\?/, // processing instructions (<?xml is fine to lose — browsers don't need it)
  /javascript:/i,
  /data:text\/html/i,
  /@import/i,
  // Catch-all for event handlers, independent of quoting. The attribute
  // scan below can only see well-formed quoted values; SMIL handlers on
  // allowlisted <animate>/<set> (onbegin, onend, onrepeat) are the one
  // handler class that survives innerHTML, so screen them textually too.
  /[\s"'/]on[a-z]+\s*=/i,
  // Any url(...) that isn't a local #reference (gradients, clips, filters)
  /url\(\s*['"]?(?!#)/i,
];

const TAG_RE = /<\s*\/?\s*([a-zA-Z][a-zA-Z0-9:_-]*)/g;
const ATTR_RE =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'`=<>]+)/g;

const validateSvg = (svg) => {
  if (!svg.startsWith("<svg") || !svg.endsWith("</svg>")) return false;
  if (Buffer.byteLength(svg, "utf8") > SVG_MAX_BYTES) return false;
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(svg)) return false;
  }
  for (const match of svg.matchAll(TAG_RE)) {
    if (!ALLOWED_TAGS.has(match[1].toLowerCase())) return false;
  }
  for (const match of svg.matchAll(ATTR_RE)) {
    const attr = match[1].toLowerCase();
    const raw = match[2];
    // Unquoted values are legal markup, but nothing the model needs, and
    // they are exactly what desynced the old scan. Reject, don't interpret.
    if (raw[0] !== '"' && raw[0] !== "'") return false;
    if (attr.startsWith("on")) return false;
    if (attr === "href" || attr === "xlink:href") {
      if (!raw.slice(1, -1).trim().startsWith("#")) return false;
    }
  }
  return true;
};

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

/** Carries the HTTP status and OpenAI error code so callers can branch. */
class OpenAiError extends Error {
  constructor(path, status, code, detail) {
    super(`OpenAI ${path} ${status} ${code || ""}: ${detail.slice(0, 300)}`);
    this.name = "OpenAiError";
    this.status = status;
    this.code = code;
  }
}

const BILLING_CODES = new Set([
  "insufficient_quota",
  "credit_balance_exhausted",
  "billing_hard_limit_reached",
]);

/**
 * True when OpenAI is refusing everything, not just this request —
 * either explicitly (chat/completions names the billing code) or as a
 * bare 429. The moderation endpoint reports an exhausted balance as an
 * uncoded 429 reading "Too Many Requests", identical to a genuine rate
 * limit, so both land here: either way /draw is unavailable rather than
 * broken, and "the safety scanner is down" would send Andrew chasing the
 * wrong thing.
 */
const isUnavailable = (err) =>
  err instanceof OpenAiError &&
  (BILLING_CODES.has(err.code) || err.status === 429);

const openAiFetch = async (path, payload, apiKey, timeoutMs) => {
  if (timeoutMs <= 0) throw new Error(`no time left in budget for ${path}`);
  const response = await fetch(`https://api.openai.com/v1/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    // A rejected key is worth un-caching so the next request re-reads SSM
    if (response.status === 401 || response.status === 403) forgetOpenAiKey();
    const detail = await response.text().catch(() => "");
    let code = null;
    try {
      code = JSON.parse(detail)?.error?.code || null;
    } catch {
      // non-JSON error body — status alone will have to do
    }
    throw new OpenAiError(path, response.status, code, detail);
  }
  return response.json();
};

/** Shared reply for "OpenAI is refusing everything", loudly logged. */
const unavailableResponse = (err) => {
  const billing = BILLING_CODES.has(err.code);
  console.error(
    billing
      ? "OPENAI_CREDITS_EXHAUSTED — /draw is down until the balance is topped up"
      : `OPENAI_UNAVAILABLE (${err.status}) — out of credits or rate limited: ${err.message}`,
  );
  return json(503, {
    error: billing
      ? "the robot is out of ink and Andrew has to buy more — check back another day"
      : "the robot is out of ink or overwhelmed — try again later",
  });
};

/** True = content is fine; throws on API failure so callers fail closed. */
const passesModeration = async (text, apiKey, budgetMs) => {
  const data = await openAiFetch(
    "moderations",
    { model: "omni-moderation-latest", input: text },
    apiKey,
    Math.min(10_000, budgetMs),
  );
  const result = data.results?.[0];
  if (result?.flagged) {
    const categories = Object.entries(result.categories || {})
      .filter(([, v]) => v)
      .map(([k]) => k);
    console.log(JSON.stringify({ event: "moderation_flagged", categories }));
    return false;
  }
  return true;
};

const generateSvg = async (prompt, apiKey, ipHash, budgetMs) => {
  const data = await openAiFetch(
    "chat/completions",
    {
      model: GENERATION_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0.8,
      // Hashed end-user identifier — OpenAI's recommended way to keep one
      // abusive visitor from reflecting on the whole account.
      user: `hc-${ipHash}`,
    },
    apiKey,
    budgetMs,
  );
  const choice = data.choices?.[0];
  let svg = choice?.message?.content?.trim() || "";
  svg = svg
    .replace(/^```(?:svg|xml|html)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
  // Truncation is a routine outcome for "detailed" prompts and produces
  // markup with no closing tag; without this it reads as "the robot drew
  // outside the lines" and the visitor retries the same doomed prompt
  return { svg, truncated: choice?.finish_reason === "length" };
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const drawingToJson = (item) => ({
  id: item.id.S,
  name: item.drawnBy.S,
  prompt: item.prompt.S,
  svg: item.svg.S,
  createdAt: item.createdAt.S,
});

const handleDraw = async (event) => {
  // One shared deadline for both OpenAI calls. CloudFront abandons the
  // origin at 60s, so anything past that is billed work nobody receives:
  // the visitor gets CloudFront's own HTML 504 while the drawing lands in
  // the gallery under an id they were never told. Budget to 50s and let
  // the handler answer with real JSON instead.
  const deadline = Date.now() + 50_000;
  const remaining = () => deadline - Date.now();

  let body;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : event.body || "";
    if (raw.length > 10_000) return json(400, { error: "request too large" });
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "invalid request body" });
  }

  const name = String(body.name ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const prompt = String(body.prompt ?? "").trim();
  if (!name || name.length > NAME_MAX) {
    return json(400, {
      error: `every artist signs their work — add a name (up to ${NAME_MAX} characters)`,
    });
  }
  if (!prompt || prompt.length > PROMPT_MAX) {
    return json(400, {
      error: `describe something to draw (up to ${PROMPT_MAX} characters)`,
    });
  }

  const ipHash = hashIp(viewerIp(event));
  const now = new Date();
  const hourBucket = now.toISOString().slice(0, 13); // e.g. 2026-07-31T18
  const dayBucket = now.toISOString().slice(0, 10);

  // The per-visitor counter deliberately counts ATTEMPTS, including ones
  // that never reach a model — otherwise retrying junk is free and someone
  // can hammer the endpoint all day. It only ever costs that one visitor.
  const ipCount = await bumpCounter(`ip#${ipHash}#${hourBucket}`, 2 * 3600);
  if (ipCount > PER_IP_HOURLY_LIMIT) {
    return json(429, {
      error: "easy there, space cadet — the robot needs a breather. try again in an hour.",
    });
  }

  const apiKey = await getOpenAiKey();
  if (!apiKey) {
    console.error("OpenAI key missing from SSM");
    return json(500, { error: "the drawing robot isn't wired up yet" });
  }

  // Moderate BEFORE generation; fail closed if the moderation call errors.
  let clean;
  try {
    clean = await passesModeration(`${name}\n\n${prompt}`, apiKey, remaining());
  } catch (err) {
    if (isUnavailable(err)) return unavailableResponse(err);
    console.error("moderation error", err);
    return json(502, { error: "the safety scanner is down — try again in a minute" });
  }
  if (!clean) {
    return json(400, {
      error: "that prompt strayed off the flight plan — try drawing something else",
    });
  }

  // The global cap is claimed HERE — the last moment before the only
  // billable call — so it tracks money actually at risk. Counting it at
  // the top of the request instead meant rejected prompts, a missing key
  // and moderation outages all ate the day's budget, which turned free
  // moderation traffic into a way to take /draw offline for everyone at
  // no cost to the attacker. Claiming it before the call rather than
  // after keeps concurrent requests from overshooting the ceiling.
  const dayCount = await bumpCounter(`budget#${dayBucket}`, 48 * 3600);
  if (dayCount > DAILY_GLOBAL_LIMIT) {
    return json(429, {
      error: "the robot has drawn a lot today and its pen is out of ink — come back tomorrow.",
    });
  }

  // Whatever moderation left, minus a beat to store the result and reply
  let svg, truncated;
  try {
    ({ svg, truncated } = await generateSvg(
      prompt,
      apiKey,
      ipHash,
      remaining() - 3_000,
    ));
  } catch (err) {
    if (isUnavailable(err)) return unavailableResponse(err);
    console.error("generation error", err);
    return json(502, { error: "the robot's pen jammed — try again" });
  }
  if (truncated) {
    console.log(JSON.stringify({ event: "svg_truncated", ipHash }));
    return json(502, {
      error: "that one got away from the robot — try asking for something simpler",
    });
  }
  if (!validateSvg(svg)) {
    console.log(JSON.stringify({ event: "svg_rejected", ipHash }));
    return json(502, { error: "the robot drew outside the lines — try again" });
  }

  const id = randomBytes(5).toString("hex");
  const createdAt = now.toISOString();
  try {
    await ddb.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: { S: `drawing#${id}` },
          id: { S: id },
          drawnBy: { S: name },
          prompt: { S: prompt },
          svg: { S: svg },
          createdAt: { S: createdAt },
          ipHash: { S: ipHash },
          gsi1pk: { S: "drawings" },
          gsi1sk: { S: `${createdAt}#${id}` },
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
  } catch (err) {
    console.error("put error", err);
    return json(500, { error: "mission control lost the drawing — try again" });
  }

  console.log(JSON.stringify({ event: "drawing_created", id, ipHash, dayCount }));
  return json(200, { id, name, prompt, svg, createdAt });
};

const handleGetDrawing = async (id) => {
  const res = await ddb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { pk: { S: `drawing#${id}` } },
    }),
  );
  if (!res.Item) {
    // 410, not 404 — CloudFront rewrites 404s into the SPA's index.html
    return json(410, { error: "that drawing drifted off into deep space" });
  }
  return json(200, drawingToJson(res.Item), {
    // Drawings are immutable once created — let browsers keep them
    "cache-control": "public, max-age=86400, immutable",
  });
};

const handleListDrawings = async () => {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :pk",
      ExpressionAttributeValues: { ":pk": { S: "drawings" } },
      ScanIndexForward: false,
      Limit: GALLERY_LIMIT,
    }),
  );
  return json(
    200,
    { drawings: (res.Items || []).map(drawingToJson) },
    { "cache-control": "public, max-age=60" },
  );
};

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || "GET";
  const path = event.rawPath || "/";

  try {
    if (method === "POST" && path === "/api/draw") return await handleDraw(event);
    if (method === "GET" && path === "/api/drawings")
      return await handleListDrawings();
    const idMatch = method === "GET" && path.match(/^\/api\/drawings\/([a-f0-9]{10})$/);
    if (idMatch) return await handleGetDrawing(idMatch[1]);
    return json(400, { error: "unknown route" });
  } catch (err) {
    console.error("unhandled error", err);
    return json(500, { error: "mission control hiccup — try again" });
  }
};
