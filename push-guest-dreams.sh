#!/usr/bin/env bash
# Push admin search (93b11da) + guest_dreams (next commit) and deploy firestore.rules.
set -euo pipefail
cd "$(dirname "$0")"

if pgrep -x git >/dev/null; then
  echo "A git process is running — finish it first." >&2
  exit 1
fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

echo "== typecheck"; npx tsc --noEmit
echo "== tests";     npm test

echo "== push"
git push origin main
git log --oneline -2

echo "== firestore rules (guest_dreams needs admin read access)"
./deploy-firestore-rules.sh
