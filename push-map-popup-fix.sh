#!/bin/bash
# Попап карты: видимый текст и аккуратный список снов — проверка и push.
set -e
cd /Users/dimab/Documents/oneiro-web
if pgrep -x git >/dev/null; then echo "git уже запущен — попробуй позже"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock .git/next-index-*.lock
rm -rf _to_delete
npm test
npx tsc --noEmit
git push origin main
echo "✅ Запушено."
