#!/bin/bash
# Push the golden-swan commit (and any earlier unpushed commits). Run on the Mac.
set -e
cd "$(dirname "$0")"

if pgrep -x git >/dev/null; then
  echo "A git process is running — try again in a moment." >&2
  exit 1
fi

# Clean stale locks and temp objects the bridge VM left behind
rm -f .git/index.lock .git/HEAD.lock
find .git -name 'tmp_obj_*' -delete 2>/dev/null || true
find .git -name 'stale-*-lock' -delete 2>/dev/null || true
rm -rf _to_delete

echo "== typecheck =="
npx tsc --noEmit
echo "== tests =="
npm test

echo "== push =="
git push
echo "Done."
