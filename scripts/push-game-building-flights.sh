#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script from the main branch."
  exit 1
fi

files=(
  app/api/game/_lib/player.ts
  app/api/game/_lib/placement.ts
  app/api/game/buildings/route.ts
  app/api/game/state/route.ts
  app/app/game/GameClient.tsx
  app/app/game/BuildingUnlockFlight.tsx
  app/app/PrimaryNav.tsx
  app/app/PrimaryNavStars.module.css
  lib/game/buildingPlacementEffect.ts
  lib/gamePendingBuildings.test.ts
  lib/auth/ensureUser.ts
  lib/i18n/messages/types.ts
  lib/i18n/messages/en.ts
  lib/i18n/messages/es.ts
  lib/i18n/messages/ar.ts
  lib/i18n/messages/pt.ts
  lib/i18n/messages/de.ts
  lib/i18n/messages/ru.ts
  public/game/earth-surface.svg
  scripts/push-game-building-flights.sh
)

git add -- "${files[@]}"
git commit --only -m "Save buildings before city detection and animate their journey to Earth" -- "${files[@]}"
git push origin main
