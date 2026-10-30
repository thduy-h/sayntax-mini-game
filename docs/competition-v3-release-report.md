# Competition V3 release report — local verification

No production connection, writes, migration, settings, CORS, JWT changes, function deploy, Vercel publication or push. Existing unrelated working-tree changes were preserved. The publication checkout remains unchanged at the preceding release; this patch is local only.

## Product correction

1. Root cause: participant kept its own local item index and could navigate every frozen prompt/map. Presentation used persisted active_index, while RPC only checked item membership. V3 removes participant selection and checks active/open item in the transaction.
2. MC-only synchronized progression: start_stage opens item1; close_challenge and advance_challenge require current expected index under competition UPDATE lock. Submission uses SHARE locks then team UPDATE and rechecks current item, timestamps, expiry/revocation after the lock. All teams and presentation receive the same item and aggregate progress. MC sees each team's submitted/pending status. Future/past/closed items fail before insertion.
3. Separate contrast-button tutorial and4×4 Robot tutorial, both repeatable and local-only. The Robot demo has a verified five-command optimum; neither ID occurs in official content. MC/spectators see a read-only demo; participant demo never invokes official scoring.
4. QR before: separate room code/QR selection for each stage. After: one code-only `/join/:code`, canonical Stage1 room alias, with a read-only code resolver for legacy compatibility. Internal stage rooms remain separate.
5. Identity: same competition_team_id and pre-associated room-team rows, one issued random session capability hash on both room sessions. State projects current room-team ID. Existing browser sessions continue; another device restores with the hashed recovery credential, never the display name. Recovery reissue remains MC-approved in person and revokes prior sessions. No new competition identity after stage1 begins.
6. Presentation remains capability-authenticated and read-only; sends only current public prompt/map and aggregate counts, never correct answer/solver data or private roster/submissions. Existing presentation link spans both stages until expiry/revocation.

## Verification

| Check | Actual result | Boundary |
| --- | --- | --- |
| Vitest |32 tests,6 files passed | Pure engine/contracts/demo tests |
| Deno |19 passed | Canonical scoring/transport/CORS/auth, progression and narrow code resolver; mocked fetch |
| Seven Edge Function deno checks |Passed | Source/runtime type checks, not hosted invocation |
| TypeScript lint script |Passed | `tsc --noEmit`, no separate ESLint configuration |
| Vite production build |Passed | `tsc -b && vite build`; final standalone chunks below500kB |
| Playwright full regression |40/40 passed,2.7min | Desktop1440×900/mobile390×844, mocked Edge transport with real public content/maps |
| PostgreSQL17.11 |Passed | Real disposable database and concurrent psql connections |
| PostgreSQL16.15 |Passed | Same local-only V1/V2/V3 migration/concurrency/security chain |
| npm audit |0 vulnerabilities | Installed npm dependency tree |
| Git/scoped whitespace |Passed | Includes untracked source/migration/test files, not just tracked diff |
| Visual review |20 required screenshots inspected | Contact sheets plus original mobile prompts/demo; seeded credentials only |

PostgreSQL evidence includes unchanged main-site metadata fingerprints after real website migrations; full V1 ten-repeat and V2 five-repeat regressions; V3 six repeated8-team runs; current-question/map agreement; first-answer lock and concurrent duplicates; initial concurrent question100/team and completed Accessibility400/team; highest Robot retry score retains100; all attempt/score/aggregate invariants; CAS competing MC advances; old/future/expired item rejection; deadline expiry while waiting for team lock; independent-team progress; close/finalize and token-revocation races both orders×3; validation/attempt/aggregate fault rollback and concurrent recovery; no unresolved lock waits; browser schema/table/RPC denial, RLS and fixed invoker search paths; custom dump/restore; guarded rollback/reapply including exact restoration of the five original function definitions. All data/roles/Auth fixtures are disposable local synthetic data. No live Supabase test was executed.

Logs: `.local-audit/v3-postgres17.log`, `v3-postgres16.log`, `v3-full-e2e.log`, `v3-edge-tests.log`, `v3-deno-check.log`, `v3-build.log`, `v3-dependency-audit.log`. These are intentionally local/ignored artifacts.

## Screenshots and visual findings

Exact20 screenshot paths: [visual review](competition-v3-ui-review.md). Directories: `artifacts/ui-review/desktop/` and `artifacts/ui-review/mobile/`; contact sheets are one level above. Required screens: admin dashboard, Accessibility demo/presentation/participant, Robot demo/presentation/participant, persistent join QR, Stage2 restoration, final leaderboard.

Corrected mobile table word fragmentation using readable horizontal scrolling; dynamic4×4 demo-grid layout; wrapping option letters; ambiguous official point text in demo; and screenshot capture races with lazy loading. Final prompts/maps are readable, public presentation cards have no submit/run controls, all required pages have no page-wide horizontal overflow, controls use44px minimum height, QR280px/four-module quiet zone matches the expected matrix, and the SAYNTAX typography/borders/palette remain. Physical phone/projector scanning and broader browser/accessibility testing remain operational checks.

## Migration and functions

New migration: `20261031010000_arena_competition_v3.sql`.

SHA-256: `40bb2fb472529aa968e0536e3ae6fa4494145d49110700350a92cc940fa07e0b`.

Adds4 columns and replaces5 existing invoker RPC/trigger-function definitions. No new tables, schemas, policies, endpoint or browser grants. V1 SHA remains `3722ba18fa2583c59640e5165f69cf841f773c8881e30e1f15bf904bb221d65d`; V2 SHA remains `14248a881261f032883204219dd5ad34c24e5bd3a0104914cdfc4f5302758b10`. Original website migration SQL is unchanged. Verification and guarded rollback are prepared. Deployment-checkout generator includes original two website SQL files plus V1/V2/V3 and SHA manifest; no remote migration-list/dry-run executed under the production connection ban.

All seven existing endpoints require redeployment because of shared dispatch/handler source: arena-create-room, arena-join-room, arena-manage-room, arena-start-round, arena-submit-accessibility, arena-submit-robot, arena-get-state. Keep verify_jwt=true. No new endpoint or environment/configuration change.

## Verdict and remaining gates

Local functionality/security/migration/visual verification: **GO locally**. Hosted V3 workshop: **NO-GO until approved deployment and real rehearsal**. Required next operations are separately reviewed production backup/recovery, quiet-window migration preflight/history/dry-run and reviewed V3 migration, coordinated seven-function redeployment and paired frontend rollout, post-deployment verification and real8-team rehearsal plus main-site smoke checks. No current production setting or role change is needed.

Operational limitations:5-second polling rather than instantaneous synchronization; stage caps600/900s and item defaults150/300s; a timed-out stage can be finalized with remaining questions scored zero; restoration rotates room sessions; finalized output is immutable; MC session still browser-session scoped. The V3 frontend cannot be published alone against V2 RPC behavior. Public practice maps can be independently solved in advance; hidden official solver sequences are excluded, not cryptographically secret from independent solving. No full automated axe/iOS/Safari/physical projector scan or real hosted rehearsal/production restore was performed. No approval is implied by the local GO verdict.

## Scoped changed files

- `src/App.tsx`
- `src/styles.css`
- `src/features/competition/Content.tsx`
- `src/features/competition/CompetitionPortal.tsx`
- `src/features/competition/types.ts`
- `src/features/competition/api.ts`
- `src/features/competition/Demo.tsx`
- `src/features/competition/JoinEntry.tsx`
- `src/lib/competitionDemo.test.ts`
- `supabase/migrations/20261031010000_arena_competition_v3.sql`
- `supabase/rollback/20261031010000_arena_competition_v3.rollback.sql`
- `supabase/verification-competition-v3.sql`
- `supabase/functions/_shared/competition-api.ts`
- `supabase/functions/_shared/handler.ts`
- `supabase/functions/_shared/competition_test.ts`
- `supabase/functions/arena-join-room/index.ts`
- `tests/database/competition_v3.py`
- `tests/database/transactions.py`
- `tests/e2e/competition.spec.ts`
- `tests/e2e/join-routing.spec.ts`
- `tests/e2e/workshop.spec.ts`
- `scripts/test-arena-competition-v3.sh`
- `scripts/prepare-arena-deployment.py`
- `playwright.config.ts`
- `package.json`
- `.gitignore`
- `docs/competition-v3-plan.md`
- `docs/competition-v3.md`
- `docs/competition-v3-ui-review.md`
- `docs/competition-v3-release-report.md`
- `docs/gameplay.md`
- `docs/scoring.md`
- `docs/architecture.md`
- `docs/shared-supabase-security.md`
- `docs/shared-supabase-migration.md`
- `docs/workshop-rehearsal.md`
- `docs/release-audit.md`
- `docs/production-deployment-checkpoint.md`
