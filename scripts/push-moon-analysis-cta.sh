#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script from the main branch."
  exit 1
fi
files=(
  app/components/moon/MoonGate.tsx
  lib/i18n/first-dream.ts
  scripts/push-moon-analysis-cta.sh
)
git add -- "${files[@]}"
if ! git diff --cached --quiet -- "${files[@]}"; then
  git commit --only -m "Guide visitors from locked Moon access to dream analysis" -- "${files[@]}"
fi
git push origin main
