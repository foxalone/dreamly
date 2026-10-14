#!/usr/bin/env bash
set -euo pipefail
cd /Users/dimab/Documents/oneiro-web
if [ "$(git branch --show-current)" != main ]; then
  echo "Switch to main before running this script." >&2
  exit 1
fi
files=(
  app/layout.tsx
  app/components/PwaLaunch.tsx
  app/components/PwaLaunch.css
  lib/pwaLaunch.ts
  lib/pwaLaunch.test.ts
  lib/i18n/messages/types.ts
  lib/i18n/messages/en.ts
  lib/i18n/messages/es.ts
  lib/i18n/messages/ar.ts
  lib/i18n/messages/pt.ts
  lib/i18n/messages/de.ts
  lib/i18n/messages/ru.ts
  public/manifest.json
  public/launch/moon.webp
  public/launch/forest.webp
  public/launch/castle.webp
  docs/pwa-launch.md
)
git add -- "${files[@]}"
if ! git diff --quiet HEAD -- "${files[@]}"; then
  git commit --only -m "Add an illustrated welcome for installed PWAs" -- "${files[@]}"
fi
git push origin main
