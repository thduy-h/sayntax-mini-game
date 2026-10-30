# Release audit — current atomic submission candidate

## Competition V3 — local patch, production approval gate (2026-10-31)

MC-authoritative challenge synchronization, dedicated zero-score demos and one persistent join QR are implemented locally. V1/V2 SQL unchanged; new V3 SHA-256 `40bb2fb472529aa968e0536e3ae6fa4494145d49110700350a92cc940fa07e0b`. Actual checks:32 Vitest,19 Deno,40 Playwright, seven Edge type checks, TypeScript, build, npm audit0, PostgreSQL16/17 concurrency/security/restore/rollback and20 inspected UI screenshots. Browser transport is mocked; database connections are real but disposable/local. No production action or push performed.

Complete evidence, changed objects and remaining blockers: [V3 release report](competition-v3-release-report.md). Operational/deployment instructions: [V3 guide](competition-v3.md). Hosted V3 remains NO-GO until approved coordinated release and a real eight-team rehearsal. Older release statements below are historical.

## Deployment update — 2026-10-31

The operator reports all seven Competition V2 Edge Functions have been deployed and has explicitly requested pushing the frontend/source to `thduy-h/sayntax-mini-game`. The V2 database migration is applied as recorded below. This update does not independently verify deployed function versions or hosted end-to-end behavior; the real eight-team rehearsal and website smoke checks remain outstanding. Previous statements that function deployment was still pending describe the earlier checkpoint.

## Production migration applied — 2026-10-30

The user explicitly approved migration execution ("cứ migrate đi"). Supabase MCP applied the exact reviewed V2 SQL successfully to `hiuetzywfwudajaorqkx`. MCP recorded version **20261030165721**, name `arena_competition_v2`. The previously planned local version was 20261030180000; local migration/rollback filenames and references now match the actual version. No remote migration-history repair occurred. SQL SHA-256 remains `14248a881261f032883204219dd5ad34c24e5bd3a0104914cdfc4f5302758b10`; baseline remains unchanged.

Remote history now has four versions: 20260309184500, 20260412000000, 20261030100000, 20261030165721. Do not apply V2 again under another version. The isolated checkout generator now includes these four matching files; no migration should be pending if history remains unchanged.

Live post-migration read-only checks: 13 Arena tables, all RLS enabled; no browser schema/table/RPC grants; zero unsafe definer/search_path functions, aggregate mismatches, finalized snapshot mismatches, invalid winners or overfull competitions. All 22 live Arena function bodies match reviewed local SQL. Website public/Auth object/RLS/ACL/function/trigger fingerprint stayed `014ee5a5db4b5e1e2fb6230c8471ea77`. This is metadata verification, not a website browser smoke test. No competition or rehearsal rows were created.

Pre/post Arena metadata snapshots were saved locally outside source control. These contain no table rows and are **not a full database backup**. No full production pg_dump/provider restore point could be verified through the available MCP; no production restore rehearsal was performed. Local disposable dump/restore and rollback evidence remains as previously recorded.

Only the database migration was authorized/executed. Edge Functions, frontend, CORS/JWT/project settings remain untouched. Seven Edge redeploys, frontend publication and real hosted rehearsal are still required; full V2 workshop production readiness remains NO-GO. Historical statements below about an unapplied V2 or a blanket production connection ban describe the preceding task and are superseded by this checkpoint.

## Competition V2 — current local release audit (2026-10-30)

This section supersedes earlier candidates below. The operator reports the baseline and seven functions are already deployed. No production connection, migration, settings change, function deployment, Vercel publication or Git push was performed for V2.

Implemented: independent 10-minute Accessibility / 15-minute Robot rooms, stable competition identity, cross-device hashed recovery and MC-approved reissue, atomic submissions/deadlines/finalization, immutable score snapshots, equal 50/50 normalization, merit tie-breaks and deterministic sudden death with unique-winner publication guard. Separate MC control, participant and capability-protected presentation interfaces; practice remains independent. Shared presentation polling budget supports workshop phones; JWT verification remains true.

New SQL `20261030165721_arena_competition_v2.sql`: SHA-256 `14248a881261f032883204219dd5ad34c24e5bd3a0104914cdfc4f5302758b10`. Deployed baseline remains unchanged: `3722ba18fa2583c59640e5165f69cf841f773c8881e30e1f15bf904bb221d65d`. Additive arena-only DDL, RLS/no browser grants, invoker-only RPCs and fixed search paths. All seven existing endpoints need redeployment; no eighth endpoint. V2 rollback/verification and isolated-checkout generator updated. The isolated-checkout generator includes both original website migrations and reviewed Arena source; generated paths are ephemeral and must be regenerated after any source change.

Actual verification evidence:

- Vitest: **24 passed**, 4 files.
- Deno: **17 passed** after the shared-spectator budget regression; seven endpoint type checks passed.
- TypeScript `npm run lint` and production Vite build passed. The lint script is TypeScript, not a separate ESLint audit.
- Playwright: **32 passed** desktop/mobile full suite; focused V2 suite additionally **4 passed**, including keyboard activation, no horizontal overflow and presentation/control screenshots. Edge transport is mocked. Earlier simultaneous build/test invalidated one run by replacing preview assets; rerunning with a stable build passed. Final complete rerun: **32/32 passed in 2.1 minutes**, including the latest polling guards and keyboard/screenshot checks.
- Disposable PostgreSQL **16.15 and 17.11**: V1 + additive V2 migration, two original website migrations, real parallel connections, max8, five V2 scoring repetitions (200/400XP), eight-team isolation, highest Robot score, lifecycle/merit/sudden death (including missing vs zero answer), shared-lock independent-team progress, both finalization/recovery race orders three times, expired deadline while blocked, validation/attempt/aggregate fault rollback/retry, no unresolved locks, RLS/grants, unchanged website metadata, custom dump/restore and guarded rollback/reapply: passed. Legacy ten-repeat concurrency suite remains passing on both versions.
- BFS: all nine authoritative curated maps replay successfully with shortest paths <=24; preset shortest lengths9/12/12. Actual alternative level7 route executes13 commands vs12 optimal and scores92. Robot failure0, two-extra84 and floor60 verified through authoritative simulation.
- npm audit: **0 vulnerabilities**. Git diff/added-file whitespace checks, frontend privileged-key identifier scan and server-only competition content exclusion from built JS passed. Synthetic SDK header checks for legacy JWT vs publishable keys passed.

These are local proofs with synthetic Auth and mocked HTTP/browser transport, not hosted Supabase/Vercel end-to-end evidence. No remote migration-list/dry-run was run under this task's production connection ban. Provider backup restoration, hosted JWT/CORS/schema/grants, Edge deployment compatibility and a real eight-team competition remain deployment gates.

| Area | Verdict | Evidence boundary |
| --- | --- | --- |
| Standalone practice | GO locally | Existing browser/unit regression |
| Competition logic | GO locally | Real PostgreSQL16/17 and server scoring tests |
| Admin dashboard | CONDITIONAL GO | Desktop/mobile mocked Edge transport |
| Presentation | CONDITIONAL GO | SQL projection/capability tests + mocked browser/budget tests |
| Cross-stage identity | CONDITIONAL GO | SQL concurrency/recovery + fresh browser contexts; hosted rehearsal pending |
| Local database/migration | GO locally | Fresh install, compatibility, grants, dump/restore, rollback/reapply |
| Edge Functions | CONDITIONAL GO | Type checks/unit/transport tests; hosted integration pending |
| Production deployment | NO-GO | Approval, remote preflight/backup, deployment and real rehearsal required |

Operational constraints: MC session is browser-session based with no cross-device account recovery; save team recovery cards. MC must verify recovery requests in person. Competitions expire after48 hours. Repeated sudden-death ties may extend the award buffer; publication remains blocked while tied. Shared-project outages/resources still affect both apps. Practice maps remain public; V2 removes official optimal hints during active competition but cannot prevent prior practice or independent solving. Poll traffic is calculated, not measured on hosted infrastructure. No full automated axe audit was run; keyboard, reduced-motion regression, read-only controls, labels, mobile overflow and screenshots were checked.

Full instructions, exact future deployment commands, backup/rollback and Vietnamese eight-team rehearsal: [Competition V2 guide](competition-v2.md).

This report supersedes the pre-fix scoring/connection verdicts. Full operational and recovery instructions: [production checkpoint](production-deployment-checkpoint.md).

## Atomic scoring correction — 2026-10-30 (latest)

All three confirmed submission defects are fixed and verified locally. Old SUM-overwrite trigger regression fails with canonical=200/cached=100 on real PostgreSQL 17.11. Revised SQL uses atomic deltas plus one invoker-only process_submission RPC for token/state/config validation, attempt/idempotency, canonical score, aggregate and response. Lock order is room SHARE → round SHARE → team UPDATE; end/revoke uses room UPDATE first. MC token validation also moved under its room lock.

Migration `3722ba18fa2583c59640e5165f69cf841f773c8881e30e1f15bf904bb221d65d` replaces the old undeployed candidate; website SQL hashes remain unchanged. New isolated checkout `/tmp/sayntax-arena-deploy-vai4x9uu` includes matching Edge code, new MC signatures, revised verification/rollback comments and JWT configuration. Old checkout is superseded.

Actual tests: PostgreSQL **16.15 and 17.11** fresh installs after original website DDL, 10 repeated concurrency suites each, both end/revoke orders (3 repeats), four fault/retry conditions, cross-team progress, grants/RLS and public/Auth fingerprint assertions, custom dump/restore + rollback preserving 13 website tables: passed. Deno **8 passed**, seven entrypoints checked; Vitest **9 passed**; Playwright **1 mocked flow passed**; TypeScript/lint script and production build passed; npm ci/audit reported **0 vulnerabilities**. Lint script is TypeScript checking; no separate ESLint configuration exists.

Live read-only MCP: correct target URL, PostgreSQL 17.6, exactly the original two website migrations, Arena absent. Revised remote CLI dry-run **not executed**, because DB_URL is not available here; operator's prior success covers old hash only. No production changes/tests with writes, function deployment, frontend publication or personal-data export performed. Synthetic Auth fixtures, mocked HTTP/browser flow and local PostgreSQL do not prove hosted Supabase integration.

Verdicts: corrected local release candidate **CONDITIONAL GO**; standalone existing build/tests pass with gameplay source unchanged; production workshop **NO-GO** until new-hash dry-run, backup/recovery evidence, approved settings/deployment, real eight-team rehearsal and website smoke checks. See checkpoint for exact production-change approval boundaries.


## Competition V2 backend correction — 2026-10-31

Production `/competition/undefined` was caused by a response-contract mismatch: the deployed V1 `arena-create-room` returned `{room, mcToken}` instead of the V2 `{competitionId, mcToken}`. The old missing-session message did not identify this cause. The frontend now validates the response before saving credentials/navigation, rejects legacy/malformed success payloads, and offers recovery to `/competition` for invalid links without granting MC authority.

With explicit operator approval, all seven existing Arena Edge Functions were redeployed to project `hiuetzywfwudajaorqkx` from reviewed backend commit `6b8d676d7cb0f93d14061c4f6e6c066288699128`. All seven report version **3**, **ACTIVE**, and **verify_jwt=true**. Downloaded entrypoints and every reachable relative dependency were compared byte-for-byte with that commit and matched. This correction did not change database objects, settings, CORS, secrets or website source. The already-applied V2 migration was not rerun.

Frontend regression evidence: Vitest **29 passed** (5 files); focused Competition Playwright **12 passed** on desktop/mobile, including mocked eight-team lifecycle, rejected legacy response, malformed routes, presentation denial and absence of MC authority from a URL alone. TypeScript checking and production build passed. Browser Edge transport is mocked; these results do not constitute a real hosted eight-team rehearsal. No production competition/test rows were created in this correction.

Backend source deployment is verified. Hosted JWT/CORS/DB integration through a real competition, eight-team rehearsal and website smoke checks remain operational gates. A complete production backup/restore has not been verified. Production competition verdict remains **CONDITIONAL GO pending hosted rehearsal**, not production GO. Open `/competition` to create a new competition after the frontend rollout; `/competition/undefined` cannot identify or recover a real competition.
