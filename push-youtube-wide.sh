#!/bin/bash
set -e
cd /Users/dimab/Documents/oneiro-web
if pgrep -x git >/dev/null; then echo "git is running — wait and retry"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
npx tsc --noEmit
npm test
git push
echo "Pushed. Restart the worker (Ctrl+C in its Terminal, then): npm run video-worker"
