#!/bin/bash
# Dream Kingdoms "escaped creatures" — проверка и push (коммит ed74ca6 уже сделан).
set -e
cd /Users/dimab/Documents/oneiro-web

# Мост оставляет stale-локи — убрать, если нет живого git.
if pgrep -x git >/dev/null; then echo "git уже запущен — попробуй позже"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
rm -rf _to_delete

npm test
npx tsc --noEmit

git push origin main
echo "✅ Запушено."
