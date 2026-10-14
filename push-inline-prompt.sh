#!/usr/bin/env bash
# Push 990c264 + follow-up: inline "Dreamed about this?" prompt on dictionary pages.
set -euo pipefail
cd "$(dirname "$0")"

if pgrep -x git >/dev/null; then
  echo "A git process is running — finish it first."; exit 1
fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

echo "→ tsc"; npx tsc --noEmit --incremental false
echo "→ tests"; npm test
echo "→ status"; git status -sb | head -1
echo "→ push"; git push origin main
echo "✓ pushed. Check https://dreamly.art/dreams/snake after the Vercel deploy."
