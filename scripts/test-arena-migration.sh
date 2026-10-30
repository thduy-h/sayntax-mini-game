#!/usr/bin/env bash
# Supersedes the partial pre-atomic tests with real concurrent RPC + compatibility tests.
set -euo pipefail
exec bash scripts/test-arena-transactions.sh "$@"
