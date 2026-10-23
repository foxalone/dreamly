#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$(git branch --show-current)" != "main" ]; then
  echo "Run this script on main. No changes were committed or pushed." >&2
  exit 1
fi
files=(
  app/api/admin/_lib/autoContent.ts
  app/api/admin/_lib/dictionaryVideoQueue.ts
  app/api/admin/dictionary-symbol-clicks/route.ts
  app/app/profile/admin-dashboard/DictionarySymbolClicks.tsx
  lib/adminDictionaryVideoQueue.ts
  lib/adminDictionaryVideoQueue.test.ts
  lib/i18n/dictionaryVideoQueue.ts
  scripts/auto-dictionary-content.ts
  scripts/push-dictionary-video-queue.sh
)
git diff --check -- "${files[@]}"
git add -- "${files[@]}"
if ! git diff --cached --quiet -- "${files[@]}"; then
  git commit --only -m "Add admin symbol queue for nightly English videos" -- "${files[@]}"
fi
git push origin main
