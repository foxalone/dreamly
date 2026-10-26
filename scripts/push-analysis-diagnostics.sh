#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[[ "$(git branch --show-current)" == main ]] || { echo 'Run this from main.' >&2; exit 1; }
git diff --cached --quiet || { echo 'Review existing staged changes before running this script.' >&2; exit 1; }
git add -- \
  app/ad/unlock/AdUnlockClient.tsx \
  app/api/dreams/_lib/analysisAttempts.ts \
  app/api/dreams/ad-reward/route.ts \
  app/api/dreams/guest-ad-reward/route.ts \
  app/api/dreams/analyze/route.ts \
  app/api/dreams/attempt-event/route.ts \
  app/app/profile/admin-dashboard/AnalysisAttempts.tsx \
  lib/analysisAttempts.ts lib/analysisDiagnosis.ts lib/analysisDiagnosis.test.ts \
  lib/reportAnalysisAttempt.ts lib/analysisAttemptReporter.test.ts \
  lib/i18n/analysisAttempts.ts lib/i18n/analysisDiagnosis.ts \
  scripts/push-analysis-diagnostics.sh
git diff --cached --check
git commit -m "Explain incomplete analyses and trace ad access and delivery failures"
git push origin main
