#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$(git branch --show-current)" != "main" ]; then
  echo "Switch to main before running this script." >&2
  exit 1
fi
if ! git diff --cached --quiet; then
  echo "The staging area already contains changes. Review and unstage them before running this script." >&2
  exit 1
fi
files=(
  app/components/auth/SignInMethods.tsx
  lib/auth/signInWithOptions.tsx
  lib/i18n/auth.ts
  app/signin/SignInClient.tsx
  app/ad/unlock/AdUnlockClient.tsx
  app/app/PrimaryNav.tsx
  app/app/shared/page.tsx
  app/components/GuestAnalysisLimitModal.tsx
  app/dream/DreamPageClient.tsx
  app/invite/page.tsx
  lib/i18n/messages/en.ts
  lib/i18n/messages/es.ts
  lib/i18n/messages/ar.ts
  lib/i18n/messages/pt.ts
  lib/i18n/messages/de.ts
  lib/i18n/messages/ru.ts
  scripts/push-email-signin.sh
)
git add -- "${files[@]}"
git commit -m "Add email sign-in and registration alongside Google everywhere"
git push origin main
