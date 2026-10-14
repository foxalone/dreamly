#!/bin/zsh
# Push the "native Russian dictionary copy" commit (f76a55d).
set -e
cd /Users/dimab/Documents/oneiro-web

if pgrep -x git >/dev/null; then
  echo "git is still running — wait for it to finish and rerun."; exit 1
fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

echo "→ tsc"; npx tsc --noEmit
echo "→ tests"; npm test
echo "→ push"; git push origin main
git log --oneline -1
