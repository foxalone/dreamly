#!/bin/bash
set -euo pipefail

ROOT="/Users/dimab/Documents/oneiro-web"
LOG="$HOME/Library/Logs/dreamly-auto-dictionary.log"
LOCK="$HOME/Library/Logs/dreamly-auto-dictionary.lock"
NODE_BIN="/Users/dimab/.nvm/versions/node/v20.19.6/bin"
LOCK_MAX_AGE_SEC=$((6 * 60 * 60))
CONTENT_TIMEOUT_SEC=$((5 * 60 * 60))

export PATH="$NODE_BIN:/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

mkdir -p "$(dirname "$LOG")"
exec >>"$LOG" 2>&1
echo "===== $(date '+%Y-%m-%d %H:%M:%S %Z') daily auto-dictionary ====="

kill_pid_tree() {
  local pid="$1"
  local child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_pid_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

kill_hung_job() {
  local pid="$1"
  if ! kill -0 "$pid" 2>/dev/null; then
    return
  fi
  kill_pid_tree "$pid"
  sleep 2
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
    for child in $(pgrep -P "$pid" 2>/dev/null || true); do
      kill -9 "$child" 2>/dev/null || true
    done
  fi
}

if [ -f "$LOCK" ]; then
  OLD_PID="$(tr -d '[:space:]' <"$LOCK" || true)"
  if [ -n "${OLD_PID:-}" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    LOCK_AGE=$(( $(date +%s) - $(stat -f %m "$LOCK") ))
    if [ "$LOCK_AGE" -gt "$LOCK_MAX_AGE_SEC" ]; then
      echo "stale lock pid $OLD_PID age ${LOCK_AGE}s — killing hung job"
      kill_hung_job "$OLD_PID"
    else
      echo "already running pid $OLD_PID age ${LOCK_AGE}s"
      exit 0
    fi
  fi
fi
echo $$ >"$LOCK"
trap 'rm -f "$LOCK"' EXIT

if ! cd "$ROOT"; then
  echo "cannot cd to $ROOT — grant Full Disk Access to /bin/bash in System Settings → Privacy"
  exit 1
fi

if [ "${1:-}" = "--probe" ]; then
  echo "probe ok cwd=$(pwd) package=$(test -f package.json && echo yes || echo no)"
  exit 0
fi

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

echo "running auto-dictionary-content with ${CONTENT_TIMEOUT_SEC}s watchdog"
set +e
/usr/bin/caffeinate -dims npm run auto-dictionary-content -- --wait --schedule &
CONTENT_PID=$!
(
  sleep "$CONTENT_TIMEOUT_SEC"
  if kill -0 "$CONTENT_PID" 2>/dev/null; then
    echo "content timed out after ${CONTENT_TIMEOUT_SEC}s, killing pid $CONTENT_PID"
    kill_hung_job "$CONTENT_PID"
  fi
) &
WATCHDOG_PID=$!
wait "$CONTENT_PID"
CONTENT_STATUS=$?
pkill -P "$WATCHDOG_PID" 2>/dev/null || true
kill "$WATCHDOG_PID" 2>/dev/null || true
wait "$WATCHDOG_PID" 2>/dev/null || true
set -e

echo "auto-dictionary-content exited $CONTENT_STATUS"
echo "===== $(date '+%Y-%m-%d %H:%M:%S %Z') done ====="
exit "$CONTENT_STATUS"
