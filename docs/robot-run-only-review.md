# Robot V5: whole-program official execution

Local correction, 2026-11-01, branch `robot-v5-execution-review`. No production migration, Edge deployment or frontend release is authorized for this patch.

## Defects found

`RobotPlayer` eagerly called the browser simulator for every edited queue. Its step button was present even with strategic scoring enabled. Legacy competition also offered free Run/Pause and required a local success before submitting. The strategic Run button started local animation before awaiting the server; the portal's generic error-catching action wrapper prevented callers from distinguishing a rejected request. These were free exploration paths.

The active level summary also included `isOptimal`; the submission RPC's `already_optimal` error provided another optimality oracle. Finally, the official preset used the exact public Free-play maps, and missing Robot prompts could fall back to a public canonical map by ID.

## Official execution boundary

All scored competition rooms now use `OfficialRobotPlayer`, independently of their legacy/strategic scoring flag. The component does not simulate editable commands. It renders the static released map until the server confirms a committed execution. Its only execution action is RUN PROGRAM. Editing/deleting commands is disabled while awaiting the acknowledgement and throughout automatic playback. There is no participant step, back, pause, resume, rewind, reset-playback, Ghost Path, hint, free Run or preview action. Passive animation consumes only the submitting team's committed execution trace returned by the Edge handler. Collision traces remain on the last legal cell and terminate automatically.

Definitive RPC rejection returns no execution trace. Ambiguous transport failures preserve the queue, optimization flag and idempotency key in the existing session-scoped retry cache. Refresh restores that pending program, even when the server already recorded success and polling shows the new score. The team can retrieve the same result without a second execution or optimization fee. Uncertain pending programs cannot be edited into a different retry. Definitively rejected attempts unlock editing; the database remains the authority on attempt eligibility and accounting.

`arena-submit-robot` verifies the full program against the frozen server round, invokes the atomic RPC, then returns `{ execution: { trace } }`. No preview/simulation API is added. Extra client preview/step/XP/solver fields cannot bypass the RPC; they neither change verification nor grant free execution. Valid collisions/failures are accepted official executions. Invalid program shapes are rejected before simulation results are exposed. Legacy committed failures now also receive a neutral accepted acknowledgement instead of being confused with an uncommitted transport failure.

## Scoring and information policy

V5 scoring remains `bestSuccessfulBase - 5 × optimizationExecutions`, zero without success. Base is `max(60, 100 - 8 × extraExecutedCommands)`. Failed official executions before success count as runs with no fee. After success, the team explicitly selects Tối ưu lại and sees the fee warning before RUN PROGRAM. Both successful and failed optimizations cost 5; at most two. The best successful program/base remains preserved while fees can lower the official aggregate to 50.

The patched RPC retains competition → stage → room → round → team lock ordering, token validation, immutable round matching, idempotency checks, ledger writes, scoring and aggregate updates in one transaction. New idempotency keys consume the remaining budget; changing devices or clearing browser state cannot reset it. Concurrent non-optimization submissions after a first success are rejected without silently charging a fee that the participant did not authorize.

Active summary/acknowledgement responses omit `isOptimal`, optimal command count and extra-command reference. Idempotent responses created by the old function are sanitized too. The special `already_optimal` rejection is removed so it cannot disclose hidden optimality. Both paid executions remain available under the same cap. Required verified scores are still displayed; the application does not add a solver hint or path. Optimal counts and solutions remain available only in authorized post-stage review.

## Maps and alternate routes

New V5 competitions and pending MC reconfiguration use a server-only cryptographic map freeze with `executionPolicy: run-only-v1`. Four progressive, solvable 6×6 maps are generated once and stored in the existing stage config; the immutable round inherits them. BFS references are computed from those exact frozen maps. Each map has 5/7/9/11 obstacles and a shortest program in the moderate 7–11/9–13/11–15/13–17 range, within the existing 24-command limit. Generation rejects public practice obstacle layouts. Client maps, seeds and command-count claims are ignored.

The participant/presentation state projection already releases only the active challenge; tests retain that boundary. Missing Robot challenge/config now fails closed, rather than reconstructing a map from a public level ID. The unused frontend canonical Robot competition bank was removed. The legacy room get-state/join endpoints reject competition rooms with `competition_identity_required`, preventing an alternate room-code request from retrieving the whole private config. Free-play and standalone review retain their own public practice maps; neither accepts or looks up new frozen competition maps. The dedicated Robot Demo remains 4×4 and unrelated to all four new official maps.

Existing started competitions retain their frozen maps and scores. Their old maps were already public practice content; that historical disclosure cannot be revoked. Use a new competition for the private-map guarantee. No existing official results are rewritten. Showing an active grid necessarily allows human planning or external tools; this patch removes application-provided free exploration and pre-release map exposure, without claiming that a visible puzzle can be made impossible to solve externally.

## Demo and presentation

MC Live Robot Demo retains its separate step/pause/resume/reset controls, server-versioned queue and deterministic demo trace. The public presentation remains read-only and mirrors MC actions across independent browser contexts through the existing polling transport. Demo actions never invoke official submission accounting, change team scores, consume attempts or alter official deadlines. Separate local practice retains manual controls on its dedicated example map. Accessibility, persistent join/presentation QR, team recovery, MC progression and award ceremony are preserved.

## Migration / future release review

Pending new migration: `supabase/migrations/20261101050000_arena_robot_run_only.sql`.
SHA-256: `ed34c9ce3388d337cf4b96e6d922346b0deb8136cc2233e85eb05898ade439e6`.
Rollback: `supabase/rollback/20261101050000_arena_robot_run_only.rollback.sql`.

Only existing `arena.robot_level_summary` and `arena.process_submission` are replaced; no new table, RPC endpoint, website/Auth object or browser privilege. Both remain SECURITY INVOKER with fixed `search_path=pg_catalog`; execution is service-role-only. Rollback is tested before new-policy attempts and intentionally refuses once such attempts exist: preserve canonical records and use a forward fix. Applied migrations are unchanged.

Future deployment requires a coherent bundle of all seven Edge Functions because they share the modified competition module: `arena-create-room`, `arena-join-room`, `arena-manage-room`, `arena-start-round`, `arena-get-state`, `arena-submit-accessibility`, `arena-submit-robot`. JWT verification remains true. The create/configure, submit and finalized-review functions must agree on frozen maps; do not release only the frontend or only map creation. The deployment helper's `--run-only` option prepares local files/checksums and maps existing actual production migration versions; it performs no remote command. Production operations must be reviewed separately.

The earlier color-vision backend migration (`20261101040000` source / actual production version `20261031203037`) and manage-room v6 had already been applied before the urgent no-production instruction arrived. They were not reapplied during this Robot patch. Their frontend synchronization and mobile square-sprite fixes remain in this local review batch. Vercel automatic deployment is disabled for this review branch; main is unchanged.

## Verification evidence

- Vitest: 35 passing tests, including fail-closed Robot map resolution and definitive-vs-ambiguous rejection handling.
- Deno: 24 passing tests, including 20 independently frozen four-map sets, canonical scoring, trusted collision traces, RPC rejection, spectator denial and ignored forged preview/step/solver fields.
- Real PostgreSQL 17: complete legacy/V2/V3/display/V5/vision/run-only regression, 52 PASS scenario groups. New tests include 3×8 teams, eight-way same-key replay after identity restoration, six-way distinct-key optimization cap races, preserved best program, 50-point post-fee floor, future/closed/deadline rejection, revocation and finalization races in both lock orders, invoker/grants/website isolation, rollback/reapply and guarded rollback after new-policy runs. Canonical aggregates reconcile; no unresolved lock waits.
- Seven Edge entrypoints passed `deno check`; TypeScript/lint and the production build passed. Full dependency audit: zero vulnerabilities. Deployment bundle prepared locally with checksum verification; `git diff --check` passed.
- Full Playwright regression: 72/72 passed (4.4 minutes), across desktop 1440×900 and mobile 390×844. This includes independent MC/team/presentation contexts for live demo/vision synchronization, lost-acknowledgement refresh/idempotency, execution/edit locks, eight-team two-stage identity/QR progression and staged awards. Browser tests use synthetic credentials and mocked Edge transport; actual transaction/concurrency behavior is tested separately against disposable local PostgreSQL, not claimed as a deployed Supabase rehearsal.

Review images: `artifacts/ui-review/run-only/desktop-official-run-only.png` and `artifacts/ui-review/run-only/mobile-official-run-only.png` (1440×900 / 390×844 viewports, full-page captures). Both were opened and inspected: Robot head remains square, command controls fit, fee/run count is readable, and no participant execution-preview controls appear. Wide leaderboard remains in its existing horizontal scroll region. V5 demo/ceremony screenshots are regenerated by `tests/e2e/competition-v5.spec.ts` under `artifacts/ui-review/v5/`. Physical iOS Safari is unavailable; the original mobile-device flattening is not claimed as reproduced.

Local evidence logs are under `.local-audit/robot-run-*.log`, excluded from Git. No real credentials or private snapshots are included in review images or commits.

## Verdict

Local implementation and regression: GO. Backend behavior: verified against disposable PG17 plus Deno Edge tests; multi-browser UI transport is mocked, explicitly not a real hosted deployment claim. Production: CONDITIONAL GO for a future separately reviewed migration + coherent seven-function/frontend release and a fresh private-map competition. No production operation or main-branch push was performed for this correction. Original physical iOS Safari behavior remains unverified. The historical public-map disclosure cannot be repaired retroactively.

## Subsequent approval

The user subsequently approved production release with “rồi duyệt”. See [the approved deployment record](robot-run-only-deployment.md) for actual migration mapping, backups, source comparisons and hosted verification. The local-only statements above describe the state before that later approval.
