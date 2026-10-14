#!/usr/bin/env bash
# Push the rewarded-ad feature and deploy the Firestore rules that make the
# ad-credit fields server-only.
set -euo pipefail
cd "$(dirname "$0")"
if pgrep -x git >/dev/null; then echo "A git process is running — try again in a moment."; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true
npm test
npx tsc --noEmit
git status -sb | head -1
git push origin main
npx firebase deploy --only firestore:rules
