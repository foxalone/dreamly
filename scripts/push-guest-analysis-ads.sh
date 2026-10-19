#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script from the main branch." >&2
  exit 1
fi
files=(
  app/api/dreams/_lib/guestDedup.ts
  app/api/dreams/_lib/guestQuota.ts
  app/api/dreams/analyze/route.ts
  app/api/dreams/quick-symbol/route.ts
  app/dreams/QuickSymbolFab.tsx
  lib/guestAnalysisAccess.test.ts
  lib/guestAnalysisAccess.ts
  lib/i18n/legal.tsx
  lib/i18n/messages/en.ts
  lib/i18n/messages/es.ts
  lib/i18n/messages/ar.ts
  lib/i18n/messages/pt.ts
  lib/i18n/messages/de.ts
  lib/i18n/messages/ru.ts
  lib/subscriptions/plans.ts
  scripts/push-guest-analysis-ads.sh
)
git diff --check -- "${files[@]}"
git add -- "${files[@]}"
git commit --only -m "Require an ad for every guest AI interpretation" -- "${files[@]}"
git push origin HEAD:main
