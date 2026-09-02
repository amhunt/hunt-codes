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
| `GET /api/shop` | Andrew's active Etsy listings for `/shop` — `{shop, listings, fetchedAt, stale?}` (see "Etsy shop" below) |

## Etsy shop

`/api/shop` proxies Etsy's Open API v3 for the shop `ArtifactAndy` using
only public endpoints (no OAuth): active listing ids for the shop, then one
batch call with `includes=Images`. Listings are trimmed to id, title,
formatted price, listing URL, and its 570px photos (primary first) before they are
stored or returned.

- **Credentials**: SSM SecureString `/hunt-codes/etsy-api-key`, holding
  `keystring:shared_secret` — Etsy rejects the keystring alone. The app is
  a Seller App ("huntcodes-shop-page") in the Etsy developer portal, scoped
  to the shop; its limits are 10 QPS / 10K QPD.
- **Config**: env `ETSY_SHOP_ID` (62597361) and `ETSY_SHOP_NAME`
  (`ArtifactAndy`). Both missing → 503 "not wired up".
- **Caching**: CloudFront's `/api/*` behavior is CachingDisabled, so the
  Lambda caches for itself: a per-container copy plus the DynamoDB item
  `pk = etsy#listings`. Fresh for an hour (`ETSY_FRESH_SECONDS`); after
  that the next request refetches. If Etsy fails, the stored copy is
  served with `stale: true` until it is six hours old — the ceiling Etsy's
  API Terms put on displayed listing age — then the route returns 502.
- **Terms**: the page must show the Etsy trademark notice verbatim, must
  not mimic Etsy's look, and must send buyers to Etsy for checkout. An app
  with no successful calls for six months can be suspended.

## Abuse & account-safety model

- **Moderation first**: every `name + prompt` goes through OpenAI's free
  `omni-moderation-latest` endpoint *before* any billable model call.
  Flagged input never reaches gpt-4o. Moderation errors fail closed.
- **Safety identifier**: completions carry `user: hc-<hashed ip>` so OpenAI
  attributes any abuse to the end user, not the account.
- **Rate limits** (env-tunable): `PER_IP_HOURLY_LIMIT` (default 10) and
  `DAILY_GLOBAL_LIMIT` (default 150 — the hard daily spend ceiling).
  DynamoDB atomic counters with TTL. `DAILY_GLOBAL_LIMIT` is the one that
  actually bounds spend, and it is not per-caller, so it holds regardless
  of how the per-visitor key is derived.

### Why the per-visitor key isn't `x-forwarded-for`

Behind a Function URL, Lambda passes through only the **leftmost** XFF
value, and CloudFront's appended real viewer IP is dropped before the
handler runs. Measured against this stack:

| request sends | handler sees |
| --- | --- |
| `X-Forwarded-For: 9.9.9.9` | `9.9.9.9` |
| `X-Forwarded-For: 1.1.1.1, 2.2.2.2` | `1.1.1.1` |
| *(no XFF)* | the genuine viewer IP |

So any part of that header is caller-chosen whenever the caller wants it
to be — varying it per request would mint a fresh hourly bucket and a
fresh OpenAI `user` identifier every time.

`viewerIp()` therefore prefers `CloudFront-Viewer-Address` (CloudFront
generates it and overwrites any viewer-supplied copy) and falls back to
`sourceIp`, which behind OAC is the edge POP — coarser than per-visitor,
but unforgeable. **Optional upgrade:** forward `CloudFront-Viewer-Address`
via the origin request policy and the fallback stops being used. That
means replacing the managed `AllViewerExceptHostHeader` policy with a
custom one, and the replacement must still exclude `Host` (forwarding it
breaks OAC signing against the Lambda URL host) while still forwarding
`x-amz-content-sha256` (POSTs fail to sign without it). Left undone
deliberately — the code is safe either way and the global daily cap is
the real spend ceiling.
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
