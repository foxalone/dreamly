#!/bin/bash
# Public dream pages (/dream/<id>) + comments: tests, push, Firestore rules deploy.
set -e
cd /Users/dimab/Documents/oneiro-web

# The Cowork bridge leaves stale git locks behind; clear them unless a real git runs.
if pgrep -x git >/dev/null 2>&1; then
  echo "A git process is running — try again in a moment."; exit 1
fi
rm -f .git/index.lock .git/HEAD.lock

npm test
npx tsc --noEmit

git push origin main

# Новые правила (комментарии + commentCount) должны попасть в Firebase:
./deploy-firestore-rules.sh

echo "✅ Запушено и правила задеплоены."
