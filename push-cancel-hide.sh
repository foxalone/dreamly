#!/usr/bin/env bash
# Push: hide Cancel subscription after cancellation
set -euo pipefail
cd /Users/dimab/Documents/oneiro-web

if pgrep -x git >/dev/null; then
  echo "A git process is still running — wait for it and re-run." >&2
  exit 1
fi
# The Cowork bridge cannot delete its own lock files; clear them here.
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

echo "== tsc"; npx tsc --noEmit
echo "== tests"; npm test
echo "== push"; git push origin main
git status -sb | head -1
echo "Done. Now check Vercel Production: PAYPAL_CLIENT_ID == NEXT_PUBLIC_PAYPAL_CLIENT_ID, PAYPAL_ENV=live, PAYPAL_WEBHOOK_ID=1KP186477S371301M."
