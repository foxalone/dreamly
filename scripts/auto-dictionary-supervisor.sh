#!/bin/bash
set -euo pipefail
ROOT="/Users/dimab/Documents/oneiro-web"
NODE_BIN="/Users/dimab/.nvm/versions/node/v20.19.6/bin"
export PATH="$NODE_BIN:/opt/homebrew/bin:/usr/local/bin:$PATH"
export HOME="${HOME:-/Users/dimab}"
if ! cd "$ROOT"; then
  echo "cannot cd to $ROOT"
  exit 1
fi
exec node --env-file=.env.local scripts/auto-dictionary-supervisor.mjs
