#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[ "$(git branch --show-current)" = main ] || { echo 'Switch to main before running this script.' >&2; exit 1; }
git diff --cached --quiet || { echo 'The index already contains changes. Commit or unstage them before running this script.' >&2; exit 1; }
# These message files also contain pre-existing game edits. Extract only the
# isolated horoscope insertion from each zero-context diff, leaving those edits unstaged.
python3 - "${1:-}" <<'PY'
import subprocess, re, sys
files = ['lib/i18n/messages/'+name+'.ts' for name in ['types','en','es','ar','pt','de','ru']]
diff = subprocess.check_output(['git','diff','--no-ext-diff','--unified=0','--',*files],text=True)
patch = []
for section in diff.split('diff --git ')[1:]:
    lines = section.splitlines(keepends=True)
    headers = [line for line in lines if line.startswith(('--- ','+++ '))]
    hunks = []
    for hunk in re.split(r'(?=^@@ )', ''.join(lines), flags=re.MULTILINE):
        if not hunk.startswith('@@ '):
            continue
        if any(line.startswith('+') and 'horoscope:' in line for line in hunk.splitlines()):
            changes = [line for line in hunk.splitlines() if line.startswith(('+','-'))]
            if len(changes) != 1 or not changes[0].startswith('+'):
                raise SystemExit('Translation hunk includes other changes. Stage it manually after review.')
            hunks.append(hunk)
    if hunks:
        patch.extend(headers + hunks)
if len(patch) != 21:
    raise SystemExit('Expected seven isolated horoscope translation insertions. Review and stage changes manually.')
subprocess.run(['git','apply','--cached','--unidiff-zero','--check'],input=''.join(patch),text=True,check=True)
if sys.argv[1] != '--check':
    subprocess.run(['git','apply','--cached','--unidiff-zero'],input=''.join(patch),text=True,check=True)
PY
if [ "${1:-}" = --check ]; then echo 'Selective translation staging check passed; no files staged, committed or pushed.'; exit 0; fi
git add -- \
  app/horoscope 'app/[locale]/horoscope' app/api/cron/horoscope \
  app/components/DreamMapGlobe.tsx app/components/DreamMapGlobe.module.css public/game/earth-surface.svg \
  app/components/InstallPwaBanner.tsx app/components/DreamCatcherFab.tsx app/components/moon/MoonGate.module.css app/globals.css app/app/PrimaryNav.tsx app/app/profile/page.tsx app/layout.tsx \
  app/dreams/DictionaryFooter.tsx lib/horoscope lib/horoscope.test.ts lib/horoscopePresentation.test.ts \
  lib/i18n/horoscope.ts lib/i18n/horoscope-design.ts lib/i18n/BrowserLanguageSuggestion.tsx lib/aiModels.ts \
  lib/publicPages.ts package.json package-lock.json vercel.json \
  docs/horoscope.md scripts/check-horoscope-routes.ts scripts/push-horoscope.sh
git diff --cached --check
git commit -m "Add free multilingual daily horoscope and floating Dream Map"
git push origin main
