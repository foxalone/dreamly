#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$(git branch --show-current)" != "main" ]; then
  echo "Run this script on main. No changes were committed or pushed." >&2
  exit 1
fi
files=(
  app/api/admin/emoji-dictionary/route.ts
  app/api/map/emoji-symbol/route.ts
  app/app/profile/admin-dashboard/EmojiDictionaryPanel.tsx
  app/app/profile/admin-dashboard/page.tsx
  lib/emojiDictionary.ts
  lib/emojiDictionary.test.ts
  lib/i18n/emojiDictionary.ts
  lib/searchMatching.ts
  scripts/push-emoji-dictionary-backlog.sh
)
git diff --check -- "${files[@]}"
git add -- "${files[@]}"
if ! git diff --cached --quiet -- "${files[@]}"; then
  git commit --only -m "Add admin backlog for emoji dictionary articles and map links" -- "${files[@]}"
fi
git push origin main
