#!/usr/bin/env bash
set -euo pipefail
cd /Users/dimab/Documents/oneiro-web
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Переключитесь на main перед запуском этого скрипта." >&2
  exit 1
fi
if ! git diff --cached --quiet; then
  echo "В индексе уже есть изменения. Завершите их отдельно перед запуском." >&2
  exit 1
fi
git add -- \
  app/app/profile/admin-dashboard/page.tsx \
  app/app/profile/admin-dashboard/SeoOpportunitiesPanel.tsx \
  app/api/admin/seo-opportunities/route.ts \
  app/api/admin/seo-opportunities/storage.ts \
  app/dreams/DreamSymbolView.tsx \
  lib/seo/opportunities.ts lib/seo/import.ts lib/seo/page.ts lib/seo/overrides.ts \
  lib/seoOpportunities.test.ts docs/seo-opportunities.md \
  package.json package-lock.json push-seo-opportunities.sh
if git diff --cached --quiet; then
  echo "Нет изменений для коммита."
  exit 0
fi
git commit -m "Add admin SEO opportunities with GSC imports and reversible metadata updates"
git push origin main
