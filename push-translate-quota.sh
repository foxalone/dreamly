#!/usr/bin/env bash
# Push: feed translate quota + plans modal (7edb72d) and PayPal check + activation fix.
set -euo pipefail
cd "$(dirname "$0")"

if pgrep -x git >/dev/null; then
  echo "A git process is still running — try again in a moment."; exit 1
fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

echo "== tsc =="; npx tsc --noEmit
echo "== tests =="; npm test
echo "== paypal wiring check (read-only) =="; npm run paypal-check || echo "!! paypal-check reported problems — see above"
echo "== push =="; git push origin main
git status -sb | head -1
