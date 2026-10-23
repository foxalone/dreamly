#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script from the main branch."
  exit 1
fi
files=(
  app/app/map/page.tsx
  lib/i18n/map-popup.ts
  scripts/push-map-analysis-link.sh
)
git add -- "${files[@]}"
if ! git diff --cached --quiet -- "${files[@]}"; then
  git commit --only -m "Link map dream popups to the dream analysis form" -- "${files[@]}"
fi
git push origin main
