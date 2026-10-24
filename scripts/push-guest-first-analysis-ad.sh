#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script from the main branch." >&2
  exit 1
fi
files=(
  app/ad/unlock/AdUnlockClient.tsx
  app/api/dreams/_lib/guestQuota.ts
  app/api/dreams/analyze/route.ts
  app/api/dreams/guest-ad-reward/route.ts
  app/api/dreams/quick-symbol/route.ts
  app/components/GuestAnalysisLimitModal.tsx
  app/components/useDreamAsk.ts
  app/dreams/QuickSymbolFab.tsx
  lib/adUnlock.ts
  lib/adUnlock.test.ts
  lib/guestAnalysisAccess.ts
  lib/guestAnalysisAccess.test.ts
  lib/paywall.ts
  lib/subscriptions/plans.ts
  scripts/push-guest-first-analysis-ad.sh
)
git diff --check -- "${files[@]}"
git add -- "${files[@]}"
git commit --only -m "Try ads from the first guest analysis with first-only no-fill fallback" -- "${files[@]}"
git push origin main
