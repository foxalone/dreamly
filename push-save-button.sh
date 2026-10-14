#!/usr/bin/env bash
# Push commit 24fd346 (Diary: always show Save; plans modal without subscription).
set -euo pipefail
cd "$(dirname "$0")"

if pgrep -x git >/dev/null; then
  echo "A git process is running — try again in a moment."; exit 1
fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

npm test
npx tsc --noEmit

git status -sb | head -1
git push origin main
