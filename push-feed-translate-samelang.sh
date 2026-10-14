#!/bin/bash
set -e
cd "$(dirname "$0")"
if pgrep -x git >/dev/null; then echo "a git process is running, aborting"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
npm test
npx tsc --noEmit
git push
