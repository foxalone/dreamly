#!/bin/bash
# Node 22: commit ab30565 (engines) уже сделан; здесь докоммичиваем untrack scratch-папок,
# пересобираем и деплоим functions, пушим main.
set -e
cd "$(dirname "$0")"

if pgrep -x git >/dev/null; then echo "git ещё работает — подожди"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock

# 1) второй коммит: убрать из индекса .ai-image-work и _to_delete (файлы на диске остаются)
git rm -r -q --cached .ai-image-work _to_delete 2>/dev/null || true
git diff --cached --quiet || git commit -q -m "Untrack ignored scratch dirs (.ai-image-work, _to_delete)"

# 2) functions на Node 22
nvm use 22 >/dev/null 2>&1 || true
( cd functions && npm install && npm run build )
firebase deploy --only functions
firebase functions:list

# 3) push
git push origin main
git log --oneline -3
