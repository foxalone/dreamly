#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script from the main branch."
  exit 1
fi
files=(
  app/HomeView.tsx
  app/components/HomeHero.tsx
  app/components/HomeUniverse.tsx
  app/components/HomeUniverse.module.css
  lib/i18n/home-universe.ts
  scripts/push-home-universe.sh
)
git add -- "${files[@]}"
if ! git diff --cached --quiet -- "${files[@]}"; then
  git commit --only -m "Add an animated Earth and Moon section to the homepage" -- "${files[@]}"
fi
git push origin main
