#!/usr/bin/env bash
set -euo pipefail
cd /Users/dimab/Documents/oneiro-web
if [[ "$(git branch --show-current)" != main ]]; then
  echo 'Switch to main before running this script.' >&2
  exit 1
fi
if ! git diff --cached --quiet; then
  echo 'There are already staged changes. Review them before running this script.' >&2
  exit 1
fi
files=(
  app/api/dreams/_lib/guestQuota.ts
  app/api/dreams/analyze/route.ts
  app/api/dreams/quick-symbol/route.ts
  app/api/dreams/guest-ad-reward/route.ts
  app/components/GuestAnalysisLimitModal.tsx
  app/components/PaywallHost.tsx
  app/components/RewardedAdButton.tsx
  app/components/useDreamAsk.ts
  app/dreams/QuickSymbolFab.tsx
  lib/guestAnalysisAccess.ts
  lib/guestAnalysisAccess.test.ts
  lib/i18n/messages/en.ts
  lib/i18n/messages/es.ts
  lib/i18n/messages/ar.ts
  lib/i18n/messages/pt.ts
  lib/i18n/messages/de.ts
  lib/i18n/messages/ru.ts
  lib/i18n/messages/types.ts
  lib/paywall.ts
  push-guest-ad-choice.sh
)
git diff --check -- "${files[@]}"
git add -- "${files[@]}"
git commit -m "Offer guests sign-in or rewarded ad after analysis limit"
git push origin main
