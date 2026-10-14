#!/bin/bash
set -euo pipefail
cd /Users/dimab/Documents/oneiro-web

# clean stale bridge git locks
if pgrep -x git >/dev/null; then echo "a git process is running - abort"; exit 1; fi
rm -f .git/index.lock .git/HEAD.lock

npm test
npx tsc --noEmit

git push

echo "=== 1/2: upload the two already-built videos to YouTube (Nov 13 + Nov 14, 12:00 ET) ==="
npx tsx --env-file=.env.local scripts/retry-youtube.ts \
  "free:4TUFeQDgzDits9djDNov@2026-11-13T17:00:00.000Z" \
  "free:MC3MpP0KHSCMLaqi85cx@2026-11-14T17:00:00.000Z"

echo "=== 2/2: smoke-test the new OpenAI voice through MoneyPrinterTurbo ==="
cd /Users/dimab/MoneyPrinterTurbo
"$HOME/.local/bin/uv" run python - <<'PY'
import os, tempfile
from app.services import voice
f = os.path.join(tempfile.mkdtemp(), "probe.mp3")
sm = voice.tts("Dreams about gardens often point to quiet growth and patience.", "openai:nova", 1.0, f)
assert sm is not None, "openai tts returned None"
assert os.path.getsize(f) > 10_000, "openai tts produced a suspiciously small file"
print("openai tts OK:", os.path.getsize(f), "bytes ->", f)
PY

echo "ALL DONE - tonight's 02:00 cycle should book Nov 18 with the OpenAI voice."
