#!/usr/bin/env bash
# Push: auto pairs queue their image for Instagram/Facebook/Threads again,
# five hours after the video (05:00 → 10:00, 15:00 → 20:00); a page that already
# has an image keeps it — only the video is generated, the existing image is published.
set -euo pipefail
cd "$(dirname "$0")"

if pgrep -x git >/dev/null; then
  echo "A git process is running — try again in a moment."; exit 1
fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

npm test
npx tsc --noEmit

git status -sb | head -1
git push origin main
