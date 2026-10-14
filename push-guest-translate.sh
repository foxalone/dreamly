#!/usr/bin/env bash
# Guest feed translations + AdSense Offerwall fallback: verify and push main.
set -euo pipefail
cd /Users/dimab/Documents/oneiro-web

if pgrep -x git >/dev/null; then
  echo 'A git process is running — wait for it to finish, then rerun.' >&2
  exit 1
fi
# The Cowork bridge leaves stale locks behind (it cannot unlink them).
rm -f .git/index.lock .git/HEAD.lock

if [[ "$(git branch --show-current)" != main ]]; then
  echo 'Switch to main before running this script.' >&2
  exit 1
fi

echo '▶ npm test'
npm test
echo '▶ tsc'
npx tsc --noEmit

echo '▶ push'
git push origin main
git log --oneline -3
