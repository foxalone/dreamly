#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[ "$(git branch --show-current)" = main ] || { echo 'Switch to main before running this script.' >&2; exit 1; }
files=(
  app/api/cron/horoscope/route.ts
  app/api/cron/horoscope-worker/route.ts
  app/api/horoscope/request/route.ts
  app/api/horoscope/access/route.ts
  app/api/horoscope/ad/route.ts
  app/ad/unlock/AdUnlockClient.tsx
  app/horoscope/HoroscopeAccess.tsx
  lib/horoscope/access.ts
  lib/horoscope/access-cookie.ts
  lib/horoscope/access-http.ts
  lib/horoscopeAccess.test.ts
  lib/i18n/horoscope-access.ts
  app/horoscope/CosmicForecast.tsx
  app/horoscope/HoroscopeActions.tsx
  app/horoscope/HoroscopeContent.tsx
  app/horoscope/HoroscopeView.tsx
  app/horoscope/horoscope.css
  docs/horoscope.md
  docs/horoscope-on-demand.md
  lib/aiModels.ts
  lib/horoscope.test.ts
  lib/horoscopeSSR.test.ts
  lib/horoscopePolling.test.ts
  lib/horoscope/cache.ts
  lib/horoscope/generate.ts
  lib/horoscope/jobs.ts
  lib/horoscope/model.ts
  lib/horoscope/persistence.ts
  lib/horoscope/polling.ts
  lib/horoscope/security.ts
  lib/horoscope/store.ts
  lib/i18n/horoscope.ts
  lib/i18n/horoscope-design.ts
  lib/i18n/horoscope-jobs.ts
  vercel.json
  package.json
  scripts/horoscope-worker.ts
  scripts/check-horoscope-routes.ts
  scripts/push-horoscope-forecast-fix.sh
)
git diff --check -- "${files[@]}"
git add -- "${files[@]}"
git diff --cached --check -- "${files[@]}"
# --only excludes unrelated files already staged by other work.
git commit --only -m "Gate daily horoscope access with free allowances and rewarded ads" -- "${files[@]}"
git push origin main
