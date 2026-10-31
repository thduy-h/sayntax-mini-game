# MC progress, progression and demo correction — 2026-11-01

## Findings

- MC rendered `Demo` with `readOnly` in both the real portal and standalone preview. This suppressed the answer/program controls even though demo attempts are local and unscored. Official MC prompts remain read-only; presentation demos remain read-only.
- Progress used `?? 0` for missing backend fields, displaying a fabricated `0/0` when the authenticated roster contained teams. Missing or inconsistent totals now display registered-team count and an explicit backend compatibility message. No submitted count is inferred from registration.
- Next-item availability assumed six questions/four levels even for a frozen older four-question/three-level configuration. It now uses backend `totalItems`, falling back only to actual config length.
- The presentation-QR migration's `competition_state` references nonexistent `s.item_deadline` and `s.review` columns. Local PostgreSQL regression reproduces the function failure. This is a code-derived finding and local reproduction, not a new inspection of live production.
- A legacy Edge Function lacking `advance_challenge` or `close_challenge` support cannot be made safe through a browser-only fallback. Do not substitute the old unrestricted `challenge` action or invent submission status.

## Database repair prepared locally

New migration: `20261101010000_arena_state_projection_fix.sql`.
SHA-256: `bfd053e884116fc1c5588c5834c2dc5443e0a6c644ecec0e12f0816c8c0562ce`.

Replaces only `arena.competition_state(uuid,text,text,uuid)` and reasserts its existing restrictive ACL. Uses the V4 verified-submission projection, real `item_deadline_at`, actual frozen item counts, and an explicit spectator projection including public progress/persistent QR. No `review` column is read or exposed. Spectators receive no roster, private submissions, answer key or optimal commands. Existing token validation, SECURITY INVOKER, fixed `pg_catalog` search path and shared locks are preserved. Scoring and lifecycle RPCs are unchanged. No public/Auth objects change.

The matching rollback restores the exact prior function, including its known defects. It preserves data but **does not restore a usable workshop**; prefer forward repair. Do not run it merely to recover scores.

Apply only after the original migrations through `20261031030000` have been reviewed/applied in order. Do not edit applied files or execute an unreviewed `db push` containing other pending migrations.

## Verification commands (local only)

```sh
npm run lint
npm test
PYTHONUNBUFFERED=1 nix shell nixpkgs#postgresql_17 -c bash scripts/test-arena-transactions.sh --state-projection
PLAYWRIGHT_EXECUTABLE_PATH=/etc/profiles/per-user/thduy-h/bin/microsoft-edge npm run test:e2e -- tests/e2e/mc-control-regression.spec.ts tests/e2e/standalone-competition.spec.ts tests/e2e/join-routing.spec.ts
git diff --check
```

Playwright uses synthetic credentials and mocked Edge transport; its web server builds production assets. PostgreSQL tests use a new disposable localhost cluster, original website migrations, existing V1/V2/V3 regressions, then V4/presentation migrations and this repair. They test the original failure, two-team counts, three repeated eight-team parallel runs, duplicate requests, current-item restrictions, MC-only progression, presentation redaction, browser grants, website fingerprints, rollback and reapply.

## Production gate

This patch does not inspect or mutate the live database. Current deployed migration/function versions must be checked before choosing pending changes. Production needs a separately approved migration plan and compatible Edge Functions if still using V2 source. No Edge source changes are needed for this SQL projection fix itself. Verify two real team sessions, all-submitted or elapsed item deadline, MC advance, presentation and participant synchronization after deployment. Pending teams before the item deadline correctly prevent advancing; this is the fairness rule, not a UI failure. Browser-only tests are not proof of production readiness.

Do not upgrade an ongoing older 4-question/3-level competition in place: V4 control/finalization and score normalization still assume its 6-question/4-level preset. This projection repair does not change those scoring semantics. Finish under the matching old backend or create/rehearse a fresh competition after a coordinated upgrade; a migration during a live workshop requires a separate compatibility plan.

Executed evidence for this patch: Vitest 32/32; Playwright join/MC/standalone regression 30/30 (desktop and mobile, mocked Edge transport); PostgreSQL 17.11 local full V1/V2/V3 suites plus the state-projection failure/repair, three repeated eight-team concurrent runs, privilege/isolation and rollback/reapply checks passed. Production remains unverified.
