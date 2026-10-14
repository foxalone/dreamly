#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if pgrep -x git >/dev/null; then
  echo "A git process is running — aborting."; exit 1
fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

echo "==> tsc"
npx tsc --noEmit
echo "==> tests"
npm test

echo "==> push"
git push origin main
git log --oneline -1
