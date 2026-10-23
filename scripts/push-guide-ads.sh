#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script from the main branch."
  exit 1
fi

files=(
  app/dreams/DreamGuidePage.tsx
  app/dreams/GuideLinkCards.tsx
  scripts/push-guide-ads.sh
)

git add -- "${files[@]}"
git commit --only -m "Add intro banners and every-fourth-cell ads to dream guides" -- "${files[@]}"
git push origin main
