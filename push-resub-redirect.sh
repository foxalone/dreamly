#!/usr/bin/env bash
# Push: re-subscribe via PayPal approve page (redirect flow)
set -euo pipefail
cd /Users/dimab/Documents/oneiro-web

if pgrep -x git >/dev/null; then
  echo "A git process is still running — wait for it and re-run." >&2
  exit 1
fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

echo "== tsc"; npx tsc --noEmit
echo "== tests"; npm test
echo "== push"; git push origin main
git status -sb | head -1
echo "== cleanup probe leftovers in Firestore"
node --env-file=.env.local scripts/paypal-resub-probe.mjs --cleanup
