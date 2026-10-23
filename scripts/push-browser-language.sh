#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script from the main branch."
  exit 1
fi

files=(
  docs/i18n.md
  lib/i18n/AppI18n.tsx
  lib/i18n/BrowserLanguageSuggestion.tsx
  lib/i18n/browser-language.ts
  lib/i18n/browser-language-messages.ts
  lib/browserLanguage.test.ts
  scripts/push-browser-language.sh
)

git add -- "${files[@]}"
git commit --only -m "Suggest supported browser languages without automatic redirects" -- "${files[@]}"
git push origin main
