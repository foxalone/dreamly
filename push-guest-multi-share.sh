#!/bin/sh
# Push "Guest sharing: one share per dream" (commit 4a031fb) — run on the Mac.
set -e
cd /Users/dimab/Documents/oneiro-web
if pgrep -x git >/dev/null 2>&1; then echo "git is running — try again later"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock .git/next-index-9.lock .git/stale-*-lock
rm -rf _to_delete
npm test
npx tsc --noEmit
git push
