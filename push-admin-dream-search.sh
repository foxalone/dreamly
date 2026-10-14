#!/usr/bin/env bash
# Push the admin dream/story search (commit 93b11da). Run from the repo root on macOS.
set -euo pipefail
cd "$(dirname "$0")"

if pgrep -x git >/dev/null; then
  echo "A git process is running — finish it first." >&2
  exit 1
fi
# the bridge VM leaves stale locks and tmp objects it cannot delete
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

echo "== typecheck"; npx tsc --noEmit
echo "== tests";     npm test

echo "== push"
git push origin main
git log --oneline -1
