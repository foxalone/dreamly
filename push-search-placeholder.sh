#!/bin/zsh
# Push the placeholder + dictionary-search→interpreter commits (through 724c0e7).
set -e
cd /Users/dimab/Documents/oneiro-web

if pgrep -x git >/dev/null; then
  echo "git is still running — wait for it to finish and rerun."; exit 1
fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

echo "→ tsc"; npx tsc --noEmit
echo "→ push"; git push origin main
git log --oneline -1
