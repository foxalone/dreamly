#!/bin/bash
set -e
cd /Users/dimab/Documents/oneiro-web
if pgrep -x git >/dev/null; then echo "git is running — abort"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
npx tsc --noEmit
npm test
git push
echo "--- dry run of the shared_dreams cleanup (skip if already applied):"
node scripts/clean-shared-dreams.mjs
echo "If the list looks right: node scripts/clean-shared-dreams.mjs --apply"
