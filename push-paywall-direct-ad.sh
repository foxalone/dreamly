#!/usr/bin/env bash
set -euo pipefail
cd /Users/dimab/Documents/oneiro-web
if pgrep -x git >/dev/null; then
  echo 'A git process is running — try again when it is done.' >&2
  exit 1
fi
rm -f .git/index.lock .git/HEAD.lock .git/next-index-*.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true
if [[ "$(git branch --show-current)" != main ]]; then
  echo 'Switch to main before running this script.' >&2
  exit 1
fi
npm test
npx tsc --noEmit
git push origin main
