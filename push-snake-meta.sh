#!/usr/bin/env bash
set -euo pipefail
cd /Users/dimab/Documents/oneiro-web

if [ "$(git branch --show-current)" != main ]; then
  echo "Switch to main after preserving your work, then rerun this script."
  exit 1
fi
if ! git diff --cached --quiet; then
  echo "There are already staged changes. Review them before running this script."
  exit 1
fi

git diff --check
node --import tsx --test lib/entryOverrides.test.ts
git add -- AGENTS.md lib/dream-dictionary.ts \
  lib/i18n/entry-overrides/ar.ts lib/i18n/entry-overrides/de.ts \
  lib/i18n/entry-overrides/es.ts lib/i18n/entry-overrides/pt.ts \
  lib/i18n/entry-overrides/ru.ts push-snake-meta.sh
git diff --cached --stat
if ! git diff --cached --quiet; then
  git commit -m "Fix snake meta descriptions across all six locales"
fi
git push origin main
