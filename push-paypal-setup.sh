#!/usr/bin/env bash
# 1) creates Dreamly's PayPal product/plans/webhook, 2) pushes the commit.
set -euo pipefail
cd "$(dirname "$0")"
if pgrep -x git >/dev/null; then echo "git is running — retry in a moment"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

echo "== tsc =="; npx tsc --noEmit
echo "== paypal setup (creates product, plans, webhook) =="
npm run paypal-setup -- --apply
echo
echo "== push =="; git push origin main
git status -sb | head -1
echo
echo "Now: put the printed PAYPAL_WEBHOOK_ID into .env.local and Vercel (Production), redeploy, then run: npm run paypal-check"
