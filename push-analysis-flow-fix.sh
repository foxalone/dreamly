#!/usr/bin/env bash
set -euo pipefail
cd /Users/dimab/Documents/oneiro-web
if [[ "$(git branch --show-current)" != main ]]; then
  echo 'Switch to main before running this script.' >&2
  exit 1
fi
if ! git diff --cached --quiet; then
  echo 'Review existing staged changes before running this script.' >&2
  exit 1
fi
files=(
  app/ad/unlock/AdUnlockClient.tsx
  app/components/PaywallHost.tsx
  app/components/PlansModal.tsx
  app/components/RewardedAdButton.tsx
  app/components/useDreamAsk.ts
  lib/adUnlock.ts
  lib/dreamAnalysisHandoff.ts
  lib/homeDreamImport.ts
  lib/offerwallVisibility.ts
  lib/offerwallVisibility.test.ts
  lib/analysisResumeRegression.test.ts
  push-analysis-flow-fix.sh
)
git diff --check -- "${files[@]}"
git add -- "${files[@]}"
git commit -m "Fix dream analysis handoff and resume after ad unlock"
git push origin main
