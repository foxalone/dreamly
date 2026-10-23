#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script from the main branch."
  exit 1
fi
files=(app/app/AppHeader.tsx scripts/push-logo-home-link.sh)
git add -- "${files[@]}"
if ! git diff --cached --quiet -- "${files[@]}"; then
  git commit --only -m "Link the Dreamly app logo to the landing page" -- "${files[@]}"
fi
git push origin main
