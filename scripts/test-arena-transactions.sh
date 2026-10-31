#!/usr/bin/env bash
# Local-only integration suite. Never consumes DB_URL or remote credentials.
set -euo pipefail
ARENA_PG_ROOT=$(mktemp -d /tmp/sayntax-arena-transactions-XXXXXX)
cleanup() { pg_ctl -D "$ARENA_PG_ROOT/cluster" stop -m fast >/dev/null 2>&1 || true; rm -rf "$ARENA_PG_ROOT"; }
trap cleanup EXIT
initdb -D "$ARENA_PG_ROOT/cluster" -A trust -U postgres >/dev/null
export PGHOST=127.0.0.1 PGPORT=${ARENA_TRANSACTION_TEST_PORT:-55441} PGUSER=postgres PGDATABASE=arena_transactions
unset PGSERVICE PGSERVICEFILE PGPASSFILE
export PGOPTIONS='-c statement_timeout=15000 -c lock_timeout=10000'
pg_ctl -D "$ARENA_PG_ROOT/cluster" -o "-p $PGPORT -h 127.0.0.1 -k $ARENA_PG_ROOT" -l "$ARENA_PG_ROOT/postgres.log" start >/dev/null
createdb "$PGDATABASE"
if [[ "${1:-}" == "--v5-focused" ]]; then
 python3 -u tests/database/v5_harness.py
else
 python3 -u tests/database/transactions.py "$@"
fi
