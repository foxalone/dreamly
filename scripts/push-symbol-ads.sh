#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script from the main branch."
  exit 1
fi

files=(
  app/dreams/DreamSymbolView.tsx
  scripts/push-symbol-ads.sh
)

git add -- "${files[@]}"
git commit --only -m "Add ads after psychological interpretation and alongside related symbols" -- "${files[@]}"
git push origin main
