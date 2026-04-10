#!/usr/bin/env bash
set -euo pipefail

mkdir -p "$CLAUDE_PROJECT_DIR/.claude/logs"
echo "[$(date '+%F %T')] Task completed" >> "$CLAUDE_PROJECT_DIR/.claude/logs/tasks.log"
