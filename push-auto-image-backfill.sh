#!/bin/bash
set -euo pipefail
cd /Users/dimab/Documents/oneiro-web
if pgrep -x git >/dev/null; then echo "git is running — retry later"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock .git/objects/*/tmp_obj_*
npm test
npx tsc --noEmit
git push origin main
git status -sb | head -1
