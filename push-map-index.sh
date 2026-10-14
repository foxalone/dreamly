#!/bin/bash
# Push commit a877ca7 (make /app/map indexable). Run on the Mac:
#   cd /Users/dimab/Documents/oneiro-web && ./push-map-index.sh
set -e
cd "$(dirname "$0")"
if pgrep -x git >/dev/null; then echo "a git process is running — try again later"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true
npm test
npx tsc --noEmit
git push origin main
echo "Pushed. After the Vercel deploy: GSC → Pages → “Excluded by ‘noindex’ tag” → Validate fix, and request indexing for https://dreamly.art/app/map."
