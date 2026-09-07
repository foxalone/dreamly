#!/bin/bash
# Коммит и пуш интеграции Tumblr в main.
# Запускать на macOS (в VM моста сети нет, git push оттуда падает 403).
set -euo pipefail
cd "$(dirname "$0")"

BRANCH="$(git branch --show-current)"
if [ "$BRANCH" != "main" ]; then
  echo "Текущая ветка — '$BRANCH', а не main. Прерываю."
  exit 1
fi

# Гейт: тесты. Здесь tsx работает (в VM моста — нет, esbuild под darwin).
echo "→ npm test"
npm test

echo "→ npx tsc --noEmit"
npx tsc --noEmit

# Залипший .git/index.lock остаётся после прерванной git-команды и блокирует
# всё остальное. Если ни один git не запущен — лок мусорный, убираем.
for LOCK in .git/index.lock .git/HEAD.lock; do
  if [ -e "$LOCK" ]; then
    if pgrep -x git >/dev/null 2>&1; then
      echo "Найден $LOCK, и при этом работает процесс git."
      echo "Закройте его (или редактор, который его держит) и запустите скрипт снова."
      exit 1
    fi
    echo "→ убираю залипший $LOCK"
    rm -f "$LOCK"
  fi
done

# Только файлы этой задачи. Никаких git add -A:
# .ai-image-work/, .claude/settings.local.json, .vercelignore, _to_delete/
# не в .gitignore и попали бы в коммит.
echo "→ git add"
git add \
  lib/adminTumblr.ts \
  lib/adminTumblr.test.ts \
  app/api/admin/tumblr \
  lib/adminVideoLibrary.ts \
  lib/socialScheduleQueue.ts \
  lib/socialPublishLog.ts \
  app/api/admin/_lib/socialSchedule.ts \
  app/api/admin/_lib/libraryVideo.ts \
  app/api/admin/video-library/route.ts \
  app/api/admin/video-library/mark-published/route.ts \
  app/app/profile/admin-dashboard/VideoLibraryPanel.tsx \
  app/app/profile/admin-dashboard/page.tsx \
  app/app/upgrade/page.tsx

echo "→ что уйдёт в коммит:"
git status --short --untracked-files=no

git commit -m "Add native Tumblr video publishing integration" -m "Publishes the same generated MP4 to the official Tumblr API (OAuth 2.0 +
NPF multipart upload), with no third-party publisher in between.

- lib/adminTumblr.ts: constants, env helpers and the pure logic (authorize
  URL, blog selection, tag building, NPF body, MP4 dimension parsing,
  temporary/permanent error classification, error sanitising)
- app/api/admin/tumblr: OAuth start/callback/status/disconnect/reset/publish
  plus getValidTumblrAccessToken with rotated refresh tokens persisted
  atomically
- Tumblr joins the shared publish queue, publish log and admin dashboard;
  a Tumblr failure never blocks the other networks
- Duplicate posts are prevented by a stored post id, a transactional claim
  and a pre-upload scan of the blog after an ambiguous failure

Also fixes an unrelated pre-existing type error: /app/upgrade typed
searchParams as SP | Promise<SP>, which Next 16 rejects because it always
passes a promise. Type-only change, same runtime behaviour.

Requires TUMBLR_CLIENT_ID and TUMBLR_CLIENT_SECRET in Vercel.
Callback: https://dreamly.art/api/admin/tumblr/callback

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AdX9wxAfnHXvuKnF5VrFFs"

echo "→ git push origin main"
git push origin main

echo
echo "Готово: $(git rev-parse --short HEAD)"
echo "Дальше: добавить TUMBLR_CLIENT_ID / TUMBLR_CLIENT_SECRET в Vercel (Production) и передеплоить."
