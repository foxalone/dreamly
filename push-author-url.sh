#!/bin/bash
set -e
cd /Users/dimab/Documents/oneiro-web
if pgrep -x git > /dev/null; then echo "A git process is running — aborting."; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
npx tsc --noEmit
npm test
git push
