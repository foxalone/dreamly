#!/usr/bin/env bash
set -euo pipefail
cd /Users/dimab/Documents/oneiro-web
[[ "$(git branch --show-current)" == main ]] || { echo 'Run this from main.' >&2; exit 1; }
git diff --cached --quiet || { echo 'Existing staged changes: review/unstage those before running this script.' >&2; exit 1; }
git add -- \
  lib/rewardedAd.ts lib/rewardedAd.test.ts \
  lib/rewardedReceipt.ts lib/rewardedReceipt.test.ts \
  app/components/RewardedAdButton.tsx app/components/PaywallHost.tsx \
  app/components/GuestAnalysisLimitModal.tsx app/components/PlansModal.tsx \
  app/api/dreams/ad-reward/route.ts app/api/dreams/guest-ad-reward/route.ts \
  app/api/dreams/_lib/subscription.ts app/api/dreams/_lib/guestQuota.ts \
  docs/rewarded-ad-audit.md scripts/push-rewarded-audit.sh
git diff --cached --check
git commit -m "Fix rewarded ad lifecycle and reward replay protection; add diagnostics"
git push origin main
