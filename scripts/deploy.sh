#!/usr/bin/env bash
#
# Sync build/ to the hunt.codes S3 bucket.
#
# Three passes, because the three kinds of file want different headers:
#   1. hashed assets      — immutable for a year, CloudFront brotlis them
#   2. .glb models        — immutable, but WE brotli them (see below)
#   3. HTML and manifests — always revalidated, never hashed
#
# Pass 2 exists because CloudFront only auto-compresses content types on
# its own allowlist, and a .glb is served as binary/octet-stream. That
# meant hunt-codes-badge.glb — which the corner medallion loads on every
# page — went out at its full 294.8KB, uncompressed, forever. It brotlis
# to 25.9KB: a 269KB saving on every cold visit, about a fifth of the
# landing page's entire transfer.
#
# Serving brotli unconditionally (rather than negotiating) is safe here:
# S3 stores one object with one encoding, and every browser that can run
# this site — it needs WebGL2 and modern ES to render anything at all —
# has supported brotli over TLS since 2017.
set -euo pipefail

BUCKET="s3://hunt.codes"
PROFILE="andrew"
IMMUTABLE="public,max-age=31536000,immutable"
REVALIDATE="public,max-age=0,must-revalidate"

# Files that are not content-hashed, so they must never be cached hard
UNHASHED=(
  "*.html"
  "robots.txt"
  "sitemap.xml"
  "site.webmanifest"
  "asset-manifest.json"
)

if [ ! -d build ]; then
  echo "build/ not found — run \`yarn build\` first." >&2
  exit 1
fi

if ! command -v brotli >/dev/null 2>&1; then
  echo "brotli not found on PATH (\`brew install brotli\`)." >&2
  exit 1
fi

exclude_unhashed=()
include_unhashed=()
for pattern in "${UNHASHED[@]}"; do
  exclude_unhashed+=(--exclude "$pattern")
  include_unhashed+=(--include "$pattern")
done

# 1 ── hashed, immutable assets (.glb handled in pass 2). Excluded paths
#      are also exempt from --delete, so the models pass 2 owns survive.
echo "→ syncing hashed assets"
aws s3 sync build/ "$BUCKET" \
  --acl public-read \
  --delete \
  --size-only \
  "${exclude_unhashed[@]}" \
  --exclude "*.glb" \
  --cache-control "$IMMUTABLE" \
  --profile "$PROFILE"

# 2 ── models, pre-compressed
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
while IFS= read -r -d '' model; do
  key="${model#build/}"
  brotli --quality=11 --force --output="$tmp/model.br" "$model"
  raw=$(wc -c <"$model")
  compressed=$(wc -c <"$tmp/model.br")
  echo "→ $key: $((raw / 1024))KB → $((compressed / 1024))KB (brotli)"
  aws s3 cp "$tmp/model.br" "$BUCKET/$key" \
    --acl public-read \
    --content-type "model/gltf-binary" \
    --content-encoding "br" \
    --cache-control "$IMMUTABLE" \
    --profile "$PROFILE"
done < <(find build -type f -name "*.glb" -print0)

# 3 ── HTML and manifests
echo "→ syncing HTML and manifests"
aws s3 sync build/ "$BUCKET" \
  --acl public-read \
  --exclude "*" \
  "${include_unhashed[@]}" \
  --cache-control "$REVALIDATE" \
  --profile "$PROFILE"

echo "✓ deployed"
