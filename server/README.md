# hunt.codes API (`/api/*`)

The one backend piece of the site: a single Lambda ([handler.mjs](handler.mjs),
no dependencies — AWS SDK v3 ships in the Node 22 runtime) behind a Function
URL, wired into both CloudFront distributions (apex + www) as the `/api/*`
cache behavior. Same-origin from the SPA, so no CORS anywhere.

The Function URL is `AWS_IAM`-only; CloudFront signs origin requests via an
Origin Access Control (OAC `E1W7CVQPO5JEZA`), so the Lambda is unreachable
except through the distributions — nobody can bypass CloudFront and hammer
the URL directly. One OAC quirk: CloudFront can't hash request bodies, so
browser POSTs must send `x-amz-content-sha256` (hex SHA-256 of the body —
see `sha256Hex` in `src/SvgGenerator.tsx`) or the origin signature fails.

## Endpoints

| Route | What |
| --- | --- |
| `POST /api/draw` | `{name, prompt}` → moderate → generate (gpt-4o) → validate SVG → store → `{id, name, prompt, svg, createdAt}` |
| `GET /api/drawings` | 12 most recent drawings (gallery) |
| `GET /api/drawings/{id}` | one drawing; **410** when missing (CloudFront rewrites 403/404 into the SPA's index.html, so those statuses are unusable for the API) |

## Abuse & account-safety model

- **Moderation first**: every `name + prompt` goes through OpenAI's free
  `omni-moderation-latest` endpoint *before* any billable model call.
  Flagged input never reaches gpt-4o. Moderation errors fail closed.
- **Safety identifier**: completions carry `user: hc-<hashed ip>` so OpenAI
  attributes any abuse to the end user, not the account.
- **Rate limits** (env-tunable): `PER_IP_HOURLY_LIMIT` (default 10) and
  `DAILY_GLOBAL_LIMIT` (default 150 — the hard daily spend ceiling).
  DynamoDB atomic counters with TTL, keyed off the *viewer's* IP (the last
  `x-forwarded-for` hop — `sourceIp` is always a CloudFront POP here).
- **Deadline budget**: both OpenAI calls share one 50s deadline, under
  CloudFront's 60s origin read timeout. Past that CloudFront returns its
  own HTML 504 and the visitor never receives a drawing that was billed.

## Why untrusted SVG renders in an `<img>`

The XSS gate is the **renderer**, not the allowlist. Every stored drawing
is served into an inert `data:image/svg+xml` `<img>` (`toDataUri` in
`src/SvgGenerator.tsx`): scripts never run, event handlers — including
SMIL `onbegin`/`onend` on `<animate>` — never fire, CSS can't reach the
host page, and each image is its own document so ids can't collide across
gallery thumbnails. The wave animation is static CSS baked into the SVG,
which is why it survives without script.

An earlier revision inlined the markup with `dangerouslySetInnerHTML` and
relied on the server allowlist alone. An adversarial review defeated that
allowlist three ways — unquoted attributes (`onbegin=alert(1)` matches no
quoted-value regex), quote desync (`<desc>x="</desc>` swallows the next
start tag), and `<style>` (document-scoped, so a drawing restyled the whole
site). Regexes cannot safely parse untrusted markup. **Do not switch the
renderer back to inlining.**

The server allowlist remains as defense in depth — it drops `style` and
`text`, screens event handlers textually, and rejects unquoted attribute
values rather than interpreting them. `scratchpad/validator-test.mjs`-style
checks cover all of the above exploit payloads.

## AWS resources (us-west-2, account 985326477333, profile `andrew`)

- Lambda `hunt-codes-draw-api` (nodejs22.x, 512MB, 65s timeout) + public
  Function URL; role `hunt-codes-draw-api-role` scoped to the table, the
  SSM parameter, and CloudWatch logs.
- DynamoDB `hunt-codes-draw` (on-demand, TTL on `expiresAt`): counter items
  (`ip#…`, `budget#…`) expire; drawings (`drawing#<id>`) live forever and
  are listed via GSI `gsi1` (`gsi1pk="drawings"`, `gsi1sk=createdAt#id`).
- SSM SecureString `/hunt-codes/openai-api-key` — set manually, never in git:

  ```sh
  aws ssm put-parameter --profile andrew --region us-west-2 \
    --name /hunt-codes/openai-api-key --type SecureString \
    --overwrite --value 'sk-…'
  ```

- CloudFront: origin `draw-api` (the Function URL, 60s read timeout — the
  ceiling on generation time) + behavior `/api/*` with the managed
  CachingDisabled + AllViewerExceptHostHeader policies, all methods.

## Deploying changes

```sh
./deploy.sh
```

Frontend dev server proxies `/api` to production (see rsbuild.config.ts),
so local `/draw` hits the real API. The proxy targets `www.hunt.codes` —
the apex is a Squarespace 302 to www that a proxied fetch won't follow.

## Troubleshooting

- **`/api/*` returns the SPA's HTML with a 200**: CloudFront got a 403
  from the origin and rewrote it via CustomErrorResponses. Check
  `x-cache: Error from cloudfront`. OAC needs **both** `lambda:InvokeFunctionUrl`
  *and* `lambda:InvokeFunction` granted to `cloudfront.amazonaws.com` per
  distribution — granting only the first is a silent 403.
- **503 "out of ink"**: the OpenAI balance is empty. `chat/completions`
  reports `credit_balance_exhausted`; the moderation endpoint reports the
  same condition as a bare uncoded 429, so both map to 503 and log
  `OPENAI_CREDITS_EXHAUSTED` / `OPENAI_UNAVAILABLE`.
