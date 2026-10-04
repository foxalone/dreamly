#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script on main."
  exit 1
fi
if ! git diff --cached --quiet; then
  echo "Commit or unstage existing staged changes first."
  exit 1
fi
npm run typecheck
git add -- next.config.ts app/app/profile/page.tsx lib/i18n/messages/{types,en,es,ar,pt,de,ru}.ts push-profile-version.sh
if ! git diff --cached --quiet; then
  git commit -m "Show deployed build commit below profile UID"
fi
git push origin HEAD:main
