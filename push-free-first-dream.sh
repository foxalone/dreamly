#!/usr/bin/env bash
# Push 297cb6a (one free diary save without a subscription) and deploy the
# Firestore rules change that makes freeDreamSavesUsed server-only.
set -euo pipefail
cd "$(dirname "$0")"

if pgrep -x git >/dev/null; then
  echo "A git process is running — try again in a moment."; exit 1
fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

npm test
npx tsc --noEmit

git status -sb | head -1
git push origin main

# Rules must reach production too, otherwise a user can reset freeDreamSavesUsed
# from the browser and save again.
npx firebase deploy --only firestore:rules
