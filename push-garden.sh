#!/bin/bash
# Push the "garden" dictionary symbol (commit on main).
set -e
cd "$(dirname "$0")"
if pgrep -x git >/dev/null; then echo "A git process is running — try again in a moment."; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true
npx tsc --noEmit
npm test
git push origin main
echo "Pushed."
