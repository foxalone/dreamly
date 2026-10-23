#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script from the main branch."
  exit 1
fi
files=(
  app/ad/unlock/AdUnlockClient.tsx
  app/api/dreams/_lib/analysisAttempts.ts
  app/api/dreams/_lib/guestQuota.ts
  app/api/dreams/ad-reward/route.ts
  app/api/dreams/analyze/route.ts
  app/api/dreams/guest-ad-reward/route.ts
  app/api/dreams/quick-symbol/route.ts
  app/app/dreams/page.tsx
  app/app/profile/admin-dashboard/AnalysisAttempts.tsx
  app/components/GuestAnalysisLimitModal.tsx
  app/components/GuestDreamJournal.tsx
  app/components/HomeDreamAsk.tsx
  app/components/useDreamAsk.ts
  app/dreams/InlineDreamPrompt.tsx
  docs/analysis-attempts.md
  lib/analysisAttemptMetadata.test.ts
  lib/analysisAttemptReporter.test.ts
  lib/analysisAttempts.ts
  lib/guestAnalysisAccess.test.ts
  lib/guestAnalysisAccess.ts
  lib/homeDreamImport.ts
  lib/i18n/analysisAttempts.ts
  lib/i18n/messages/ar.ts
  lib/i18n/messages/de.ts
  lib/i18n/messages/en.ts
  lib/i18n/messages/es.ts
  lib/i18n/messages/pt.ts
  lib/i18n/messages/ru.ts
  lib/reportAnalysisAttempt.ts
  lib/subscriptions/plans.ts
  app/components/DreamComposerForm.tsx
  app/components/AnalysisDisplay.tsx
  lib/guestDreamHistory.ts
  lib/homeDreamPending.ts
  lib/homeDreamPending.test.ts
  lib/i18n/first-dream.ts
  scripts/push-guest-free-and-flow.sh
)
git add -- "${files[@]}"
if ! git diff --cached --quiet -- "${files[@]}"; then
  git commit --only -m "Restore daily guest analysis, track reading flow and prompt first dreams" -- "${files[@]}"
fi
git push origin main
