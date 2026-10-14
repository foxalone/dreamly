#!/bin/zsh
# CTR experiment (docs/seo/ctr-experiment-2026-09.md): build, commit only the experiment files, push main, verify production.
set -e
cd /Users/dimab/Documents/oneiro-web
LOG=/Users/dimab/Documents/oneiro-web/_to_delete/ctr-deploy.log
exec > >(tee "$LOG") 2>&1

if pgrep -x git >/dev/null; then echo "git is still running — wait and rerun."; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name 'tmp_obj_*' -delete 2>/dev/null || true

echo "→ production snapshot BEFORE deploy"; python3 scripts/ctr-verify.py snapshot _to_delete/ctr-before

echo "→ tsc"; npx tsc --noEmit
echo "→ tests"; npm test
echo "→ production build"; npm run build

echo "→ diff of files to be committed"
FILES=(app/dreams/DreamSymbolView.tsx lib/seo/ctr-experiment.ts lib/ctrExperiment.test.ts docs/seo/ctr-experiment-2026-09.md)
git add -- "${FILES[@]}"
git diff --cached --stat
git status --short | grep -v '^??' | grep -v '^[AM]  ' && { echo "unexpected staged/modified tracked files above"; exit 1; } || true

GIT_AUTHOR_NAME=dimab GIT_AUTHOR_EMAIL=mityabv@gmail.com GIT_COMMITTER_NAME=dimab GIT_COMMITTER_EMAIL=mityabv@gmail.com \
git commit -F - <<'MSG'
seo: CTR experiment — metadata-only titles/descriptions for 27 dream pages

New lib/seo/ctr-experiment.ts overrides only the Google-facing <title> and
meta description in dreamSymbolMetadata(); OpenGraph, Twitter, JSON-LD,
canonical, hreflang, sitemap and all visible content are unchanged.
META_OVERRIDES / entry-overrides were not used because they are rewritten by
polishSeoTitle and also feed OG/Twitter/JSON-LD/IndexNow.
Page list, before/after pairs and validation: docs/seo/ctr-experiment-2026-09.md

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Vz1w4dAPHXz9MqZ7TyhSh2
MSG
SHA=$(git rev-parse HEAD); echo "committed $SHA"
echo "→ push"; git push origin main
git log --oneline -1

echo "→ waiting for Vercel production to serve the new title (max 20 min)"
for i in {1..80}; do
  T=$(curl -s -H 'Cache-Control: no-cache' https://dreamly.art/dreams/work | grep -o '<title>[^<]*' | head -1)
  if [[ "$T" == *"Every Night"* ]]; then echo "live after ~$((i*15))s: $T"; break; fi
  sleep 15
done
sleep 30
echo "→ production snapshot AFTER deploy"; python3 scripts/ctr-verify.py snapshot _to_delete/ctr-after
python3 scripts/ctr-verify.py compare _to_delete/ctr-before _to_delete/ctr-after
echo "DEPLOYED COMMIT: $SHA"
echo "DONE — log in $LOG"
