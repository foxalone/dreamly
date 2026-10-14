#!/bin/bash
set -e
cd /Users/dimab/Documents/oneiro-web
if pgrep -x git >/dev/null; then echo "git is running, abort"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true
npm test
npx tsc --noEmit
git push origin main
echo "pushed:"; git log --oneline -1
echo
echo "== stamping creatures on old shared dreams (dry run first) =="
npm run backfill-share-badges
read -p "Write these badges to Firestore? [y/N] " ok
if [ "$ok" = "y" ]; then npm run backfill-share-badges -- --write; fi
