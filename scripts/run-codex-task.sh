#!/usr/bin/env bash
set -euo pipefail

PROMPT_FILE="${1:-.claude/tasks/current-task.txt}"
PROJECT_ROOT="$(pwd)"
OUT_DIR="$PROJECT_ROOT/.claude/codex-runs"
mkdir -p "$OUT_DIR"

if [ ! -f "$PROMPT_FILE" ]; then
  echo "Prompt file not found: $PROMPT_FILE" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
JSON_FILE="$OUT_DIR/$STAMP.events.jsonl"
SUMMARY_FILE="$OUT_DIR/$STAMP.summary.txt"

echo "Running Codex on: $PROMPT_FILE"

# Wrap Codex in nix-shell so it has node/npm/npx/tsx on PATH for self-verification.
# Codex itself lives on the outer PATH (e.g. /etc/profiles/...); nix-shell only
# provides the Node toolchain. We export the prompt via env so the inner shell
# can reference it safely without requoting.
export CODEX_PROMPT="$(cat "$PROMPT_FILE")"
CODEX_BIN="$(command -v codex)"

nix-shell -p nodejs_22 --run "\"$CODEX_BIN\" exec --full-auto --json -C \"$PROJECT_ROOT\" \"\$CODEX_PROMPT\"" \
  > "$JSON_FILE"

{
  echo "=== CODEX RUN COMPLETE ==="
  echo "Prompt file: $PROMPT_FILE"
  echo "JSON log: $JSON_FILE"
  echo
  echo "=== GIT STATUS ==="
  git status --short || true
  echo
  echo "=== DIFF STAT ==="
  git diff --stat || true
  echo
  echo "=== LAST DIFF ==="
  git diff || true
} > "$SUMMARY_FILE"

echo "$SUMMARY_FILE"
