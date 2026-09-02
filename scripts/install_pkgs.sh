#!/bin/bash
# SessionStart hook for Claude Code cloud sessions (see .claude/settings.json).
# Cloud VMs start from a fresh clone, and a resumed session can land on a
# fresh VM too, so install deps on every startup/resume. Locally this exits
# before doing anything.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
set -euo pipefail
cd "$CLAUDE_PROJECT_DIR"

# Corepack's default Yarn download host (repo.yarnpkg.com) isn't on the cloud
# environment's Trusted allowlist; registry.npmjs.org is.
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export COREPACK_NPM_REGISTRY=https://registry.npmjs.org

# Yarn 4 ignores HTTP_PROXY/HTTPS_PROXY. If the VM sets them, hand them to Yarn.
p="${HTTPS_PROXY:-${https_proxy:-}}"
if [ -n "$p" ]; then
  export YARN_HTTPS_PROXY="$p"
  export YARN_HTTP_PROXY="${HTTP_PROXY:-${http_proxy:-$p}}"
fi

# "Done with warnings" + exit 0 is the normal result (peer-dep noise).
corepack yarn install --immutable
