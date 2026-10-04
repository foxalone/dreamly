#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Run this script on main. No branch was changed."
  exit 1
fi
if ! git diff --cached --quiet; then
  echo "There are already staged changes. Commit or unstage them first."
  exit 1
fi

npm run typecheck
npm test

# Stage only this fix, leaving unrelated local files alone.
git add -- app/api/dreams/fill-roots/route.ts app/app/dreams/page.tsx app/components/useDreamAsk.ts \
  lib/dreams/enrichSavedDream.ts lib/homeDreamImport.ts lib/homeDreamPending.ts \
  lib/importedDreamRoots.ts lib/homeDreamPending.test.ts push-signin-dream-fix.sh
if ! git diff --cached --quiet; then
  git commit -m "Fix imported dream symbols and resume analysis after sign-in"
fi
# A normal push refuses to overwrite remote commits if main has diverged.
git push origin HEAD:main
