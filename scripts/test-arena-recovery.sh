#!/usr/bin/env bash
# Full synthetic dump/restore and rollback are included in the transaction suite.
# Never connects to production, reads DB_URL, or exports real user data.
set -euo pipefail
exec bash scripts/test-arena-transactions.sh "$@"
