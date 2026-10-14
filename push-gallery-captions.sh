#!/bin/bash
set -e
cd "$(dirname "$0")"

if pgrep -x git >/dev/null; then
  echo "git уже работает — закрой его и запусти снова"; exit 1
fi
rm -f .git/index.lock .git/HEAD.lock

npx tsc --noEmit
npm test

git push origin main
git log --oneline -1
