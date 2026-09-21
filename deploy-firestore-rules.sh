#!/bin/bash
# Deploys firestore.rules to the Firebase project in .firebaserc (oneiro-11d15).
# Only the Firestore rules — functions, RTDB rules etc. are not touched.
set -e
cd /Users/dimab/Documents/oneiro-web

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI не найден — ставлю: npm i -g firebase-tools"
  npm i -g firebase-tools
fi

# Первый раз попросит залогиниться в браузере.
firebase login:list 2>/dev/null | grep -q '@' || firebase login

firebase deploy --only firestore:rules --project oneiro-11d15
echo "Правила задеплоены."
