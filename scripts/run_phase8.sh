#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
LOG_FILE="$(mktemp)"
trap 'rm -f "$LOG_FILE"' EXIT

run_step() {
  local label="$1"
  shift
  : > "$LOG_FILE"
  if "$@" > /dev/null 2> "$LOG_FILE"; then
    printf 'PASS %s\n' "$label"
    return 0
  fi

  printf 'FAIL %s\n' "$label"
  if [[ -s "$LOG_FILE" ]]; then
    sed -n '1,24p' "$LOG_FILE"
  else
    printf 'Command exited with a non-zero status and produced no stderr.\n'
  fi
  return 1
}

run_step "npm install" npm install --no-audit --no-fund || exit 1
run_step "npm run check" npm run check || exit 1
run_step "npm run lint" npm run lint || exit 1
run_step "npm run test" npm run test || exit 1
run_step "npm run build" npm run build || exit 1
printf 'PASS Phase 8 pipeline\n'
