#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script from the main branch."
  exit 1
fi

files=(
  app/api/admin/_lib/auth.ts
  app/api/admin/moon-clicks/route.ts
  app/api/moon/click/route.ts
  app/app/profile/admin-dashboard/MoonClicks.tsx
  app/app/profile/admin-dashboard/page.tsx
  app/components/HomeUniverse.tsx
  app/components/moon/MoonGate.tsx
  lib/i18n/adminMoonClicks.ts
  lib/moonClicks.ts
  lib/moonClicks.test.ts
  lib/trackMoonClick.ts
  scripts/push-moon-clicks.sh
)

git add -- "${files[@]}"
git commit --only -m "Track Moon clicks excluding admin and show admin counter" -- "${files[@]}"
git push origin main
