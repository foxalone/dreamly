#!/bin/bash
# Миграция на GPT-5: gpt-4o-mini/gpt-4.1-mini уходят в retirement 14.01.2027.
# Все модели теперь в коде (lib/aiModels.ts + константы в видео-воркерах),
# env-переменные моделей (Vercel) больше не читаются.
set -e
cd "$(dirname "$0")"

if pgrep -x git >/dev/null; then echo "git ещё работает — подожди"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock

git add \
  lib/aiModels.ts \
  app/api/dreams/analyze/route.ts \
  app/api/dreams/emoji-pick/route.ts \
  app/api/dreams/quick-symbol/route.ts \
  app/api/dreams/translate/route.ts \
  lib/pickDreamEmojisAi.ts \
  lib/detectDreamLang.ts \
  lib/dreams/rootWords.ts \
  scripts/video-worker.mjs \
  scripts/ai-video-worker.mjs \
  scripts/backfill-shared-lang.mjs

git diff --cached --quiet && { echo "нечего коммитить"; exit 0; }

git commit -m "Migrate retired OpenAI models to GPT-5, centralize model config in code

- gpt-4o-mini / gpt-4.1-mini (retired 2027-01-14) -> gpt-5-mini with
  reasoning_effort: minimal; temperature params removed (unsupported by GPT-5)
- new lib/aiModels.ts is the single source of truth for every model;
  OPENAI_*_MODEL / VIDEO_OPENAI_MODEL env vars are no longer read
- video workers keep their own OPENAI_MODEL const (separate machine)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GGVcu4xgXUtvuaVFgi9b2V"

git push origin main
git log --oneline -3
