#!/usr/bin/env bash
# Push the "missed night" catch-up card fixes: slot booking retries on timeouts /
# dropped fetches, a page reload no longer leaves a pair stuck in "ставим в слот…",
# a "Повторить постановку в слот" button re-runs the failed bookings, and
# "Перегенерировать N в свободные слоты" refills the holes failed pairs left.
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
