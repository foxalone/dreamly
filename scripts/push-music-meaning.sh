#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$(git branch --show-current)" != "main" ]; then
  echo "Run this script on main. No changes were committed or pushed." >&2
  exit 1
fi
files=(
  lib/dream-dictionary.ts
  lib/dreams/music-content.ts
  lib/musicContent.test.ts
  lib/i18n/seeds/ar.ts
  lib/i18n/seeds/de.ts
  lib/i18n/seeds/es.ts
  lib/i18n/seeds/pt.ts
  lib/i18n/seeds/ru.ts
  lib/i18n/entry-overrides/ar.ts
  lib/i18n/entry-overrides/de.ts
  lib/i18n/entry-overrides/es.ts
  lib/i18n/entry-overrides/pt.ts
  lib/i18n/entry-overrides/ru.ts
  app/dreams/DreamSymbolView.tsx
  scripts/push-music-meaning.sh
)
git diff --check -- "${files[@]}"
git add -- "${files[@]}"
if ! git diff --cached --quiet -- "${files[@]}"; then
  git commit --only -m "Add detailed music dream meaning in six languages" -- "${files[@]}"
fi
git push origin main
