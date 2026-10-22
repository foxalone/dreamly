#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
files=(
  app/ad/unlock/AdUnlockClient.tsx
  app/api/dreams/_lib/analysisAttempts.ts
  app/api/dreams/analyze/route.ts
  app/app/dreams/page.tsx
  app/app/profile/admin-dashboard/AnalysisAttempts.tsx
  app/components/auth/SignInMethods.tsx
  app/components/useDreamAsk.ts
  app/signin/SignInClient.tsx
  docs/analysis-attempts.md
  lib/analysisAttempts.ts
  lib/analysisAttempts.test.ts
  lib/analysisAttemptMetadata.test.ts
  lib/analysisAttemptReporter.test.ts
  lib/auth/signInWithOptions.tsx
  lib/geo/resolveIpCity.ts
  lib/i18n/analysisAttempts.ts
  lib/reportAnalysisAttempt.ts
  scripts/commit-analysis-diagnostics.sh
)
git switch -c codex/analysis-diagnostics
git add -- "${files[@]}"
git commit --only -m "Expand analysis attempt location and sign-in diagnostics" -- "${files[@]}"
# Local commit only, as requested. No push.
