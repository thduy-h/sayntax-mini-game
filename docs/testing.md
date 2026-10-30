# Testing

## Competition V2 — current local candidate (2026-10-30)

V2 adds real parallel PostgreSQL tests, Edge scoring/security tests, client simulator tests and mocked multi-context desktop/mobile E2E. Run npm run test:competition; details and evidence limitations are in the V2 guide. Never rebuild dist concurrently with Playwright preview.

[Competition V2 guide](competition-v2.md) contains the authoritative architecture, scoring, deployment gates, rollback and rehearsal instructions. Historical audit entries below describe earlier candidates.

```bash
npm test
npm run lint
npm run build
npm run test:edge
npm run test:e2e
npm run test:migration
npm audit --audit-level=high
```

`test:e2e` uses a mocked Edge backend and Microsoft Edge to exercise independent browser contexts. `test:migration` provisions disposable PostgreSQL 16 through Nix and tests database invariants. Neither test proves deployed Supabase behavior; staging rehearsal remains required.

Deployment preparation also provides `python3 scripts/prepare-arena-deployment.py` (local copies and SHA-256 manifest only) and `node scripts/verify-arena-gateway-headers.mjs` (synthetic SDK requests intercepted locally). The migration test asserts effective browser role denial on all tables/RPCs and exercises runtime grants under `service_role`. CLI production dry-run is currently blocked by managed login-role permissions; see `shared-supabase-migration.md` for exact evidence and approval boundaries.
