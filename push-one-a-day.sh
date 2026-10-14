#!/bin/bash
# One video + one image a day (12:00 / 19:00 ET): push dreamly + positioner, then re-time the queue.
set -euo pipefail
ONEIRO=/Users/dimab/Documents/oneiro-web
POSITIONER=/Users/dimab/Documents/positioner-web

clean_locks() {
  if pgrep -x git >/dev/null; then echo "git is running — stop it first"; exit 1; fi
  rm -f .git/index.lock .git/HEAD.lock
}

echo "== dreamly: checks + push"
cd "$ONEIRO"
clean_locks
npm test
npx tsc --noEmit
git push origin main

echo "== positioner: checks + push"
cd "$POSITIONER"
clean_locks
rm -f _to_delete/*.lock.* 2>/dev/null || true
rmdir _to_delete 2>/dev/null || true
npm test
npx tsc --noEmit
git push origin main

echo "== waiting for the dreamly.art deploy, then a preview of the new schedule (nothing changes yet)"
cd "$ONEIRO"
npm run auto-dictionary-content -- --respace
echo
echo "Переподключите YouTube (админка → Подключения → YouTube → Подключить заново) — нужно новое право"
echo "переносить время уже загруженных видео. Потом нажмите Enter, и перенос применится."
read -r _
npm run auto-dictionary-content -- --respace --apply || {
  echo
  echo "Есть ошибки. Если это YouTube «Reconnect YouTube»: админка → Подключения → YouTube → переподключить,"
  echo "затем:  cd $ONEIRO && npm run auto-dictionary-content -- --respace --apply"
  exit 1
}
echo "Готово: 1 видео в 12:00 ET и 1 картинка в 19:00 ET каждый день начиная с завтра."
