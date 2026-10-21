#!/usr/bin/env bash
set -euo pipefail
cd /Users/dimab/Documents/oneiro-web

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Switch to main before running this script." >&2
  exit 1
fi
if ! git diff --cached --quiet; then
  echo "The index already contains staged changes. Commit or unstage them before running this script." >&2
  exit 1
fi

files=(
  lib/dream-dictionary.ts
  lib/dreams/mud-content.ts
  lib/mudEntries.test.ts
  lib/i18n/entry-overrides/{ar,de,es,pt,ru}.ts
  lib/i18n/seeds/{ar,de,es,pt,ru}.ts
  push-mud-pages.sh
)
git diff --check -- "${files[@]}"
git add -- "${files[@]}"
git commit -m "Add native mud dream articles and related links in six languages"
git push origin HEAD:main
