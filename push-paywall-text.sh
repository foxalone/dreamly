#!/bin/bash
set -e
cd /Users/dimab/Documents/oneiro-web
if pgrep -x git >/dev/null; then echo "git уже запущен — прерываю"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true
npx tsc --noEmit
git push origin main
echo "Готово."
