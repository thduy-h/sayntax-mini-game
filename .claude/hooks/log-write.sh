#!/usr/bin/env bash
set -euo pipefail

mkdir -p "$CLAUDE_PROJECT_DIR/.claude/logs"
echo "[$(date '+%F %T')] Claude wrote/edited files in session" >> "$CLAUDE_PROJECT_DIR/.claude/logs/write.log"
