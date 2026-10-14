#!/bin/bash
set -e
cd /Users/dimab/Documents/oneiro-web
if pgrep -x git >/dev/null; then echo "git is running — wait and retry"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
npx tsc --noEmit
npm test
echo "--- live key check (1 request per library) ---"
npm run stock-pool-check -- snake || true
git push
echo "Pushed. Restart the worker: npm run video-worker"
