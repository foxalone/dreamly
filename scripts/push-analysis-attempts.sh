#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script from the main branch."
  exit 1
fi
files=(
  app/ad/unlock/AdUnlockClient.tsx
  app/api/admin/dreams/attempts/route.ts
  app/api/dreams/_lib/analysisAttempts.ts
  app/api/dreams/analyze/route.ts
  app/api/dreams/attempt-event/route.ts
  app/app/profile/admin-dashboard/AnalysisAttempts.tsx
  app/app/profile/admin-dashboard/page.tsx
  app/components/DreamLensChips.tsx
  app/components/GuestAnalysisLimitModal.tsx
  app/components/useDreamAsk.ts
  app/dreams/DreamSearch.tsx
  app/layout.tsx
  docs/analysis-attempts.md
  lib/adUnlock.ts
  lib/adUnlock.test.ts
  lib/analysisAttempts.ts
  lib/analysisAttempts.test.ts
  lib/homeDreamPending.ts
  lib/i18n/analysisAttempts.ts
  lib/paywall.ts
  lib/reportAnalysisAttempt.ts
  scripts/push-analysis-attempts.sh
)
git add -- "${files[@]}"
if ! git diff --cached --quiet -- "${files[@]}"; then
  git commit --only -m "Track incomplete dream analyses in admin and streamline guest ad flow" -- "${files[@]}"
fi
git push origin main
