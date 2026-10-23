#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script from the main branch."
  exit 1
fi
files=(
  app/HomeView.tsx
  app/components/HomeRandomDreams.tsx
  app/api/dreams/random-public/route.ts
  lib/randomDreams.ts
  lib/randomDreams.test.ts
  lib/i18n/random-dreams.ts
  app/components/ArticleAdBanner.tsx
  app/components/AdBanner.module.css
  scripts/push-home-ads.sh
)
# HomeView may still contain the previously requested, uncommitted universe section.
# Include its new dependencies only when they have not yet been committed.
for dependency in app/components/HomeUniverse.tsx app/components/HomeUniverse.module.css lib/i18n/home-universe.ts; do
  if ! git ls-files --error-unmatch -- "$dependency" >/dev/null 2>&1; then
    files+=("$dependency")
  fi
done
git add -- "${files[@]}"
if ! git diff --cached --quiet -- "${files[@]}"; then
  git commit --only -m "Add homepage discovery cards and matching ad placements" -- "${files[@]}"
fi
git push origin main
