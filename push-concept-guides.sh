#!/bin/bash
# Pushes commit "Add ten concept guides in all six locales with inline links".
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
