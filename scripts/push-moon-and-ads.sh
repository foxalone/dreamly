#!/usr/bin/env bash
set -euo pipefail

cd /Users/dimab/Documents/oneiro-web

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo 'Run this script from the main branch.' >&2
  exit 1
fi

# Only this task: Moon, ad placements, gallery performance and saved analytics notes.
files=(
  AGENTS.md MEMORY.md
  app/moon 'app/[locale]/moon' app/api/moon app/components/moon
  app/app/AppHeader.tsx app/app/map/page.tsx app/app/map/mapSeo.tsx
  app/app/shared/page.tsx 'app/[locale]/app/shared/page.tsx'
  app/components/ArticleAdBanner.tsx app/components/AdBanner.module.css
  app/components/DreamCatcherFab.tsx
  app/dreams/DreamHubView.tsx app/dreams/GuideLinkCards.tsx
  app/gallery/GalleryView.tsx app/api/gallery/thumb/route.ts
  lib/moon lib/i18n/moon.ts lib/i18n/moon-access.ts lib/i18n/moon-resident.ts
  lib/galleryThumbnail.ts lib/galleryThumbnail.test.ts
  public/moon docs/moon-preview.md docs/gallery-performance.md
  scripts/build-moon-tiles.mjs scripts/warm-gallery-thumbnails.mjs
  scripts/push-moon-and-ads.sh
)

npm run typecheck
node --import tsx --test lib/moon/*.test.ts lib/shareBadges.test.ts lib/galleryThumbnail.test.ts lib/dreamPageImage.test.ts
git diff --check -- "${files[@]}"
git add -- "${files[@]}"

# --only keeps any unrelated files already staged by other work out of this commit.
if ! git diff --cached --quiet -- "${files[@]}"; then
  git commit --only -m "Add Moon community, ad placements and faster gallery thumbnails" -- "${files[@]}"
fi

git push origin main
