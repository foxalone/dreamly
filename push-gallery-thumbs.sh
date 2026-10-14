#!/bin/bash
set -e
cd /Users/dimab/Documents/oneiro-web
if pgrep -x git >/dev/null; then echo "git is running, try again later"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
npx tsc --noEmit
npm test
git push
echo "Pushed. After deploy, open dreamly.art/gallery on your phone."
