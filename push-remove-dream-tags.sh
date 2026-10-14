#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Ошибка: сначала переключитесь на main."
  exit 1
fi

if ! git diff --cached --quiet; then
  echo "Ошибка: в индексе уже есть изменения. Завершите их коммит отдельно."
  exit 1
fi

npm run typecheck
git diff --check

if ! git diff --quiet -- app/app/dreams/page.tsx; then
  git add -- app/app/dreams/page.tsx
  git commit -m "Remove keyword tags beneath journal dreams"
fi

git push origin main
echo "Исправление отправлено в main."
