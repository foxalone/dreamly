#!/bin/bash
# Pushes commit "Add 20 dream pair pages with native copy in every language".
set -euo pipefail
cd /Users/dimab/Documents/oneiro-web

if pgrep -x git >/dev/null; then
  echo "A git process is running — close it and run this script again." >&2
  exit 1
fi
rm -f .git/index.lock .git/HEAD.lock

echo "== tests =="
npm test
echo "== typecheck =="
npx tsc --noEmit

echo "== push =="
git push origin main
git status -sb | head -1
