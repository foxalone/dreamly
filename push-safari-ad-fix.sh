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
  app/components/DreamAnalysisProgress.tsx
  app/components/GuestDreamJournal.tsx
  app/app/dreams/page.tsx
  app/globals.css
  lib/i18n/dream-analysis-progress.ts
  app/ad/unlock/AdUnlockClient.tsx
  app/components/useDreamAsk.ts
  app/components/PaywallHost.tsx
  lib/offerwallSession.ts
  lib/offerwallSession.test.ts
  lib/i18n/messages/types.ts
  lib/i18n/messages/en.ts
  lib/i18n/messages/es.ts
  lib/i18n/messages/ar.ts
  lib/i18n/messages/pt.ts
  lib/i18n/messages/de.ts
  lib/i18n/messages/ru.ts
  push-safari-ad-fix.sh
)
git diff --check -- "${files[@]}"
git add -- "${files[@]}"
git commit -m "Require user activation for ads and explain unconfirmed returns"
git push origin main
