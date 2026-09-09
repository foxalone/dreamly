#!/bin/bash
set -euo pipefail

ROOT="/Users/dimab/Documents/oneiro-web"
LOG="$HOME/Library/Logs/dreamly-auto-dictionary.log"
LOCK="$HOME/Library/Logs/dreamly-auto-dictionary.lock"
NODE_BIN="/Users/dimab/.nvm/versions/node/v20.19.6/bin"

export PATH="$NODE_BIN:/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

mkdir -p "$(dirname "$LOG")"
exec >>"$LOG" 2>&1
echo "===== $(date '+%Y-%m-%d %H:%M:%S %Z') daily auto-dictionary ====="

if [ -f "$LOCK" ] && kill -0 "$(cat "$LOCK")" 2>/dev/null; then
  echo "already running pid $(cat "$LOCK")"
  exit 0
fi
echo $$ >"$LOCK"
trap 'rm -f "$LOCK"' EXIT

cd "$ROOT"

start_worker() {
  local name="$1"
  local script="$2"
  if pgrep -f "$script" >/dev/null 2>&1; then
    echo "$name already running"
    return
  fi
  echo "starting $name"
  nohup npm run "$name" >>"$LOG" 2>&1 &
}

start_worker video-worker scripts/video-worker.mjs
start_worker ai-image-worker scripts/ai-image-worker.mjs
sleep 4

/usr/bin/caffeinate -dims npm run auto-dictionary-content -- --wait --schedule

echo "===== $(date '+%Y-%m-%d %H:%M:%S %Z') done ====="
