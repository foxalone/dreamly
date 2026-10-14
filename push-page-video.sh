#!/bin/bash
set -e
cd /Users/dimab/Documents/oneiro-web
if pgrep -x git >/dev/null; then echo "git is running — wait and retry"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
npx tsc --noEmit
npm test
git push
echo "Pushed. Vercel deploys in ~2 min; then open a dictionary page and click the yellow dot next to Common scenarios."
