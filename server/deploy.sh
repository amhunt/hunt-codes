#!/usr/bin/env bash
# Redeploy the /api Lambda after editing handler.mjs.
set -euo pipefail
cd "$(dirname "$0")"

ZIP="$(mktemp -d)/hunt-codes-draw-api.zip"
zip -j -q "$ZIP" handler.mjs
aws lambda update-function-code \
  --function-name hunt-codes-draw-api \
  --zip-file "fileb://$ZIP" \
  --region us-west-2 \
  --profile andrew \
  --no-cli-pager \
  --query '{Function: FunctionName, Updated: LastModified, Hash: CodeSha256}'
