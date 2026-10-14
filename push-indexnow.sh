#!/bin/bash
# IndexNow rework: env-driven key, lifecycle triggers, inventory diff. Run after review:
#   cd /Users/dimab/Documents/oneiro-web && ./push-indexnow.sh
set -euo pipefail
cd /Users/dimab/Documents/oneiro-web

if pgrep -x git >/dev/null; then echo "a git process is running — try again later"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock

npm test
npx tsc --noEmit

git add \
  lib/indexnow.ts \
  lib/indexnow.test.ts \
  app/api/admin/_lib/indexnow.ts \
  app/api/admin/_lib/dreamPageImageCache.ts \
  app/api/admin/indexnow/route.ts \
  app/api/cron/indexnow/route.ts \
  app/api/indexnow/key/route.ts \
  app/app/profile/admin-dashboard/IndexNowPanel.tsx \
  next.config.ts \
  public/3c472be7ec3b7ed38ae74cb3b6dbb792.txt

git commit -m "$(cat <<'MSG'
Drive IndexNow from page changes instead of a daily blanket resubmit.

The key now comes from INDEXNOW_KEY and is served at /{key}.txt through a
rewrite to /api/indexnow/key, so no key file lives in the repo. Page-image
changes ping IndexNow right after the ISR refresh; the daily cron diffs the
public inventory (new, changed, removed URLs) against a Firestore snapshot,
so unchanged pages are never resubmitted and slug renames send old + new.
The admin panel gets a single-URL test.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018iknk5ZvbucpLKEyA5LoT5
MSG
)"

git push origin main
git status -sb | head -1
