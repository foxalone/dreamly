#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script from the main branch." >&2
  exit 1
fi
files=(
  app/ad/unlock/AdUnlockClient.tsx
  app/api/dreams/_lib/analysisAttempts.ts
  app/app/dreams/page.tsx
  app/components/AdUnlockRecovery.tsx
  app/components/HomeDreamAsk.tsx
  app/components/PaywallHost.tsx
  app/components/PlansModal.tsx
  app/components/RewardedAdButton.tsx
  app/components/useDreamAsk.ts
  app/dreams/DreamSearch.tsx
  app/dreams/QuickSymbolFab.tsx
  app/layout.tsx
  docs/analysis-attempts.md
  lib/adUnlock.test.ts
  lib/adUnlock.ts
  lib/analysisAttempts.test.ts
  lib/analysisAttempts.ts
  lib/analysisDiagnosis.test.ts
  lib/analysisDiagnosis.ts
  lib/i18n/analysisAttempts.ts
  lib/i18n/analysisDiagnosis.ts
  lib/i18n/messages/ar.ts
  lib/i18n/messages/de.ts
  lib/i18n/messages/en.ts
  lib/i18n/messages/es.ts
  lib/i18n/messages/pt.ts
  lib/i18n/messages/ru.ts
  lib/i18n/messages/types.ts
  lib/offerwallSession.test.ts
  lib/offerwallSession.ts
  lib/paywall.ts
  lib/dreamAnalysisHandoff.ts
  lib/dreamAnalysisHandoff.test.ts
  lib/offerwallRecoveryScript.ts
  lib/offerwallRecoveryScript.test.ts
  scripts/push-analysis-resume.sh
)
git add -- "${files[@]}"
git commit --only -m "Fix analysis resume after ads and show all readings in Dreams" -- "${files[@]}"
git push origin main
