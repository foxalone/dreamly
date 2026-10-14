#!/bin/bash
# Коммит: firebase-functions 7.0.6 -> 7.4.x (уже задеплоено) + корень обратно на Node 24.x (как в настройках Vercel).
set -e
cd "$(dirname "$0")"
if pgrep -x git >/dev/null; then echo "git ещё работает — подожди"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
git add package.json functions/package.json functions/package-lock.json
git commit -m "Bump firebase-functions to 7.4 and align root engines with Vercel Node 24.x"
git push origin main
git log --oneline -3
