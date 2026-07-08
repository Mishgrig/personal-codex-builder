#!/bin/zsh

set -u
unsetopt BG_NICE 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
RUN_DIR="$PROJECT_DIR/.run"
LOG_DIR="$RUN_DIR/logs"

APP_HOST="${APP_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
APP_URL="http://${APP_HOST}:${FRONTEND_PORT}"
API_URL="http://${APP_HOST}:${BACKEND_PORT}"

BACKEND_PID_FILE="$RUN_DIR/backend-${BACKEND_PORT}.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend-${FRONTEND_PORT}.pid"
BACKEND_LOG="$LOG_DIR/backend-${BACKEND_PORT}.log"
FRONTEND_LOG="$LOG_DIR/frontend-${FRONTEND_PORT}.log"

ensure_runtime_dirs() {
  mkdir -p "$LOG_DIR"
}

read_pid() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    tr -d '[:space:]' < "$pid_file"
  fi
}

pid_is_running() {
  local pid="${1:-}"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

port_listener_pid() {
  local port="$1"
  lsof -n -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -n 1
}

process_cwd() {
  local pid="$1"
  lsof -a -d cwd -F n -p "$pid" 2>/dev/null | sed -n 's/^n//p' | head -n 1
}

path_matches() {
  local actual="$1"
  local expected="$2"
  [[ "$actual" == "$expected" ]]
}

matches_backend() {
  local pid="$1"
  path_matches "$(process_cwd "$pid")" "$PROJECT_DIR"
}

matches_frontend() {
  local pid="$1"
  path_matches "$(process_cwd "$pid")" "$PROJECT_DIR/frontend"
}

remove_stale_pid_file() {
  local pid_file="$1"
  local pid
  pid="$(read_pid "$pid_file")"
  if [[ -n "$pid" ]] && ! pid_is_running "$pid"; then
    rm -f "$pid_file"
  fi
}

wait_for_shutdown() {
  local pid="$1"
  local attempts=0
  while pid_is_running "$pid" && [[ "$attempts" -lt 20 ]]; do
    sleep 0.5
    attempts=$((attempts + 1))
  done
}

wait_for_port() {
  local port="$1"
  local attempts=0
  while [[ "$attempts" -lt 20 ]]; do
    if [[ -n "$(port_listener_pid "$port")" ]]; then
      return 0
    fi
    sleep 0.5
    attempts=$((attempts + 1))
  done
  return 1
}

status_line() {
  local name="$1"
  local pid_file="$2"
  local port="$3"
  local matcher="$4"
  local pid
  local listener_pid

  pid="$(read_pid "$pid_file")"
  listener_pid="$(port_listener_pid "$port")"

  if [[ -n "$pid" ]] && pid_is_running "$pid" && "$matcher" "$pid"; then
    echo "$name: running (managed by launcher, PID $pid, port $port)"
    return 0
  fi

  if [[ -n "$listener_pid" ]] && "$matcher" "$listener_pid"; then
    echo "$name: running (detected from this project, PID $listener_pid, port $port)"
    return 0
  fi

  if [[ -n "$listener_pid" ]]; then
    echo "$name: port $port is busy (another app is using it)"
    return 0
  fi

  echo "$name: stopped"
  return 1
}

start_backend() {
  local pid
  local listener_pid

  ensure_runtime_dirs
  remove_stale_pid_file "$BACKEND_PID_FILE"
  pid="$(read_pid "$BACKEND_PID_FILE")"

  if [[ ! -x "$PROJECT_DIR/.venv/bin/uvicorn" ]]; then
    echo "Backend cannot start: missing $PROJECT_DIR/.venv/bin/uvicorn"
    return 1
  fi

  if [[ -n "$pid" ]] && pid_is_running "$pid" && matches_backend "$pid"; then
    echo "Backend is already running."
    return 0
  fi

  listener_pid="$(port_listener_pid "$BACKEND_PORT")"
  if [[ -n "$listener_pid" ]] && matches_backend "$listener_pid"; then
    echo "$listener_pid" > "$BACKEND_PID_FILE"
    echo "Backend is already running."
    return 0
  fi

  if [[ -n "$listener_pid" ]]; then
    echo "Backend port $BACKEND_PORT is already busy."
    return 1
  fi

  (
    cd "$PROJECT_DIR" || exit 1
    nohup env PYTHONPATH=backend \
      "$PROJECT_DIR/.venv/bin/uvicorn" backend.app.main:app \
      --host "$APP_HOST" \
      --port "$BACKEND_PORT" \
      --app-dir "$PROJECT_DIR" >> "$BACKEND_LOG" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
  )

  wait_for_port "$BACKEND_PORT" >/dev/null 2>&1 || true
  pid="$(read_pid "$BACKEND_PID_FILE")"
  if [[ -n "$pid" ]] && pid_is_running "$pid" && matches_backend "$pid" && [[ -n "$(port_listener_pid "$BACKEND_PORT")" ]]; then
    echo "Backend started: $API_URL"
    return 0
  fi

  rm -f "$BACKEND_PID_FILE"
  echo "Backend failed to start. Check $BACKEND_LOG"
  return 1
}

start_frontend() {
  local pid
  local listener_pid

  ensure_runtime_dirs
  remove_stale_pid_file "$FRONTEND_PID_FILE"
  pid="$(read_pid "$FRONTEND_PID_FILE")"

  if [[ ! -x "$PROJECT_DIR/frontend/node_modules/.bin/vite" ]]; then
    echo "Frontend cannot start: missing $PROJECT_DIR/frontend/node_modules/.bin/vite"
    return 1
  fi

  if [[ -n "$pid" ]] && pid_is_running "$pid" && matches_frontend "$pid"; then
    echo "Frontend is already running."
    return 0
  fi

  listener_pid="$(port_listener_pid "$FRONTEND_PORT")"
  if [[ -n "$listener_pid" ]] && matches_frontend "$listener_pid"; then
    echo "$listener_pid" > "$FRONTEND_PID_FILE"
    echo "Frontend is already running."
    return 0
  fi

  if [[ -n "$listener_pid" ]]; then
    echo "Frontend port $FRONTEND_PORT is already busy."
    return 1
  fi

  (
    cd "$PROJECT_DIR/frontend" || exit 1
    nohup env VITE_API_BASE="$API_URL/api" \
      "$PROJECT_DIR/frontend/node_modules/.bin/vite" \
      --host "$APP_HOST" \
      --port "$FRONTEND_PORT" \
      --strictPort >> "$FRONTEND_LOG" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"
  )

  wait_for_port "$FRONTEND_PORT" >/dev/null 2>&1 || true
  pid="$(read_pid "$FRONTEND_PID_FILE")"
  if [[ -n "$pid" ]] && pid_is_running "$pid" && matches_frontend "$pid" && [[ -n "$(port_listener_pid "$FRONTEND_PORT")" ]]; then
    echo "Frontend started: $APP_URL"
    return 0
  fi

  rm -f "$FRONTEND_PID_FILE"
  echo "Frontend failed to start. Check $FRONTEND_LOG"
  return 1
}

stop_service() {
  local name="$1"
  local pid_file="$2"
  local port="$3"
  local matcher="$4"
  local pid
  local listener_pid

  remove_stale_pid_file "$pid_file"
  pid="$(read_pid "$pid_file")"

  if [[ -n "$pid" ]] && pid_is_running "$pid" && "$matcher" "$pid"; then
    kill "$pid" 2>/dev/null || true
    wait_for_shutdown "$pid"
    if pid_is_running "$pid"; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
    echo "$name stopped."
    return 0
  fi

  listener_pid="$(port_listener_pid "$port")"
  if [[ -n "$listener_pid" ]] && "$matcher" "$listener_pid"; then
    kill "$listener_pid" 2>/dev/null || true
    wait_for_shutdown "$listener_pid"
    if pid_is_running "$listener_pid"; then
      kill -9 "$listener_pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
    echo "$name stopped."
    return 0
  fi

  if [[ -n "$listener_pid" ]]; then
    echo "$name is using port $port, but another app is running there."
    return 0
  fi

  rm -f "$pid_file"
  echo "$name is not running."
  return 0
}

start_all() {
  local backend_ok=0
  local frontend_ok=0

  start_backend && backend_ok=1
  start_frontend && frontend_ok=1

  if [[ "$backend_ok" -eq 1 && "$frontend_ok" -eq 1 ]]; then
    echo "Application is ready."
    echo "Open: $APP_URL"
    return 0
  fi

  echo "Application did not start fully."
  return 1
}

stop_all() {
  stop_frontend
  stop_backend
}

restart_all() {
  stop_all
  start_all
}

stop_backend() {
  stop_service "Backend" "$BACKEND_PID_FILE" "$BACKEND_PORT" matches_backend
}

stop_frontend() {
  stop_service "Frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PORT" matches_frontend
}

show_status() {
  status_line "Backend" "$BACKEND_PID_FILE" "$BACKEND_PORT" matches_backend
  status_line "Frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PORT" matches_frontend
  echo "App URL: $APP_URL"
}

open_browser() {
  open "$APP_URL"
  echo "Browser opened: $APP_URL"
}

show_menu() {
  while true; do
    echo
    echo "Personal Codex Builder"
    echo "1. Start app"
    echo "2. Stop app"
    echo "3. Open in browser"
    echo "4. Restart app"
    echo "5. Status"
    echo "0. Exit"
    printf "Choose an action: "
    read -r choice

    case "$choice" in
      1) start_all ;;
      2) stop_all ;;
      3) open_browser ;;
      4) restart_all ;;
      5) show_status ;;
      0) exit 0 ;;
      *) echo "Unknown option." ;;
    esac
  done
}

print_help() {
  cat <<EOF
Usage:
  ./Personal\\ Codex\\ Builder.command [start|stop|open|restart|status]

Without an argument the script opens an interactive menu.
EOF
}

case "${1:-menu}" in
  start) start_all ;;
  stop) stop_all ;;
  open) open_browser ;;
  restart) restart_all ;;
  status) show_status ;;
  menu) show_menu ;;
  help|-h|--help) print_help ;;
  *)
    print_help
    exit 1
    ;;
esac
