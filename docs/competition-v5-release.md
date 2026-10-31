# Competition V5 — local release review

> Deployment update 2026-11-01: user approved; both migrations and all7 Edge Functions deployed and hosted8-team API rehearsal passed. See [approved deployment record](competition-v5-deployment.md). Earlier local-only status below is historical.

Review date: 2026-11-01. Implementation and local verification only. No production connection, SQL apply, Edge deployment, Vercel publication, environment, JWT or CORS change was performed. Push target is `competition-v5-review`, with automatic Vercel deployment disabled for that branch. Includes the pending BEFORE/AFTER synchronization commit.

## Root causes and resulting behavior

The MC Robot Demo previously owned a local React command queue; presentation rendered a static map, without a shared queue or execution state. BroadcastChannel/localStorage also limited Accessibility BEFORE/AFTER synchronization to tabs sharing browser storage. The preceding display-sync patch moves authenticated BEFORE/AFTER state into Arena; V5 moves live demo state into the same competition control/state boundary. Standalone practice remains local and unscored.

Previously Robot submissions retained the maximum successful score, ignored failed local runs, and could not represent a fee reducing the official score. V5 records every official execution, preserves the best successful solution separately, and updates the canonical score with its accumulated optimization fee atomically.

## Versioned rules and exact scores

Only newly created V5 competitions use six Accessibility questions (600 XP) and four Robot levels (400 points), identical frozen content across teams. Existing competitions retain their frozen legacy content, rules, rankings and results. No existing official results are converted. Stage deadlines remain 10 and 15 minutes; speed earns no points.

For a verified successful Robot run, `base = max(60, 100 - 8 * max(0, executedCommands - BFSOptimalCommands))`. Before first success, failed official runs count for tie-breaks but have no fee. Afterwards, a team must explicitly choose **Tối ưu lại**: each official optimization run, successful or failed, costs 5, with at most two. Editing and individual local debug steps are free. Final level score is zero without success; otherwise `max(0, bestBase - 5 * optimizationRuns)`. Thus the base floor is 60, while the final score can be 50. An optimal best solution disables further optimization.

Example: par8, first success11 gives76; a successful par8 optimization gives95; a failed optimization instead leaves the best solution11 and gives71. A first base60 followed by two failed optimizations gives50. Shorter solutions remain recorded even when both have base60.

Official normalization is Accessibility/12 + Robot/8. Ranking compares the exact integer numerator `2 * Accessibility + 3 * Robot` (final numerator/24), without display rounding. V5 tie-breaks are optimal Robot level count descending, official Robot runs ascending, perfect Accessibility count descending, then completed MC sudden-death results. Unresolved ties stay private and block publication. This policy is frozen for V5; legacy ranking is not changed.

## Atomicity and authoritative explanation

V5 extends `submission_attempts` with executed/optimal counts, monotonic official run number and optimization marker. Existing `submissions` remains the canonical per-item score and best verified program. `team_scores` remains the aggregate; its existing delta trigger supports downward changes. No parallel browser score ledger is introduced.

`process_submission` locks competition → stage → room → round → team, revalidates token/membership/revocation/deadlines/content/current item, and replays matching idempotency before charging. Under the team lock it counts canonical attempts, validates the explicit optimization phase/cap, inserts the attempt, updates the best solution and penalty-adjusted score, and persists the replay response in one transaction. Concurrent fresh keys cannot bypass the cap. Client XP, optimum counts, execution counts and traces are discarded: Edge simulates the canonical map and computes BFS itself. Browser roles cannot execute privileged RPCs. The frontend retains a submission UUID through an ambiguous network failure/reload and clears it only on acknowledgement.

`robot_level_summary` derives first/best successful command counts, best base, official runs, optimization runs/fee, final score and history from canonical attempts. Optimal counts remain hidden during active play. `competition_score_explanation` provides six question scores, four level explanations, canonical version and finalized normalized totals. Missing/failed levels yield zero; the Edge computes a missing unattempted optimum from the frozen canonical map only when reveal is permitted. MC receives finalized results privately, teams receive their own permitted results, and public presentation receives only the winning team's explanation at the explanation ceremony phase. Public execution histories are stripped. No credential data appears in these projections.

## Demo and publication lifecycle

`competitions.robot_demo` stores versioned queue, server-produced deterministic trace, status, step offset, start/update timestamps and optional demo-only explanation. Only MC can mutate it through `robot_demo` control operations. Compare-and-swap rejects stale edits. Queue length is bounded to24; the dedicated4×4 sample and five-command explanation are separate from official maps.

MC can add/reorder/remove/clear commands, run, pause/resume, step, reset, reveal explanation and end demo. Backend snapshot resolves current step from server time at500ms per command. Presentation consumes that trace and playback offset, animates from server-time receipt, highlights the command/position/orientation, and restores state after reconnect. It has no mutation controls. Editing/reset removes prior explanation. Demo operations never write official attempts, scores or deadlines.

Polling is scoped to1s while shared Robot Demo is visible and5s otherwise. Versioned snapshots prevent lost edits; failed/stale MC actions refresh the canonical state. With MC +8 teams +projector, demo polling is approximately10 state HTTP requests/s,21 DB RPC round trips/s including rate budgets; normal polling is approximately4.2 DB RPC round trips/s. A control plus refresh adds4 RPC round trips. These are architectural budgets, not hosted latency measurements. Rate limits retain token/IP controls and accommodate demo polling. Hosted8-team network rehearsal remains required.

Scores freeze at Stage2 finalization, independently of public reveal. `resultsState=RESULTS_READY`: MC can inspect rankings, public presentation receives no leaderboard/winner/explanation. Manual ceremony phases are waiting → intro → ranking → winner → explanation → closing. Ranking publication sets `RESULTS_PUBLISHED` and the original finalized winner atomically, only with a resolved tie. The winner identifier remains absent publicly until the winner phase. Refresh/polling cannot bypass these backend projections. There is no automatic timed progression. The persistent join QR and separate presentation capability remain unchanged.

## Changed source and database objects

Frontend: `CompetitionPortal.tsx`, `Content.tsx`, `Demo.tsx`, `types.ts`, new `V5.tsx`, `styles.css`. Shared Edge: `competition-api.ts`, `competition-content.ts`, `handler.ts`, `submit-handler.ts`; tests `competition_test.ts`, new `v5_test.ts`. Infrastructure: package scripts, deployment checkout generator, transaction harness, V5 database/browser tests, verification SQL and review-branch Vercel config. No new endpoint or dependencies.

New migrations, in order:

| File | SHA-256 |
| --- | --- |
| `20261101020000_arena_a11y_display_sync.sql` (pending preceding fix) | `37ff1dfc2603b88357255ab42bdc75e9459c4c299191a4d00e87996108febacb` |
| `20261101030000_arena_competition_v5.sql` | `8c3d7813674b6236e3603320019a3f1805193bc0c6301b5e1ef3c2ee18ddacd7` |

V5 rollback: `supabase/rollback/20261101030000_arena_competition_v5.rollback.sql`, SHA-256 `bc4fe48b98ce7d12ed10af688cb852c5bbd55d0567d8d6a92547bbafa7e8eeff`. Reverses schema/functions before any V5 competition exists; refuses after V5 history exists. Once used, prefer a forward fix or reviewed backup restore. Reverting the display patch requires reversing V5 first.

V5 adds four competition columns (`rules_version`, `ceremony_phase`, `results_published_at`, `robot_demo`), four attempt columns, official run uniqueness, result `official_runs`, new result ceiling checks, history/rule freeze triggers. Existing RPC entrypoints are wrapped with originals retained under `*_pre_v5`; adds private control implementation, demo trace/snapshot, level summary and score explanation helpers. All use SECURITY INVOKER and fixed `search_path=pg_catalog`. New functions explicitly deny PUBLIC/anon/authenticated execution; only service_role receives callable helpers. Existing RLS and browser table denial remain. Website schema/Auth tables/triggers are unchanged.

Future coherent release should redeploy all seven existing Edge Functions from the reviewed bundle: `arena-create-room`, `arena-join-room`, `arena-manage-room`, `arena-start-round`, `arena-submit-accessibility`, `arena-submit-robot`, `arena-get-state`. Principal V5 behavior is create/manage/submit-robot/get-state; all share code. No new endpoint, secret, schema exposure or environment requirement. Keep `verify_jwt=true`; never use `--no-verify-jwt`.

## Executed verification and limits

- Vitest: **32/32**, six files. Deno: **22/22**. TypeScript lint/check and production Vite build pass; seven Edge entrypoints pass `deno check`. Dependency audit: zero vulnerabilities.
- Playwright full regression: **68/68**, desktop1440×900 and mobile390×844; final targeted V5 rerun **2/2** after explanation/detail assertions. Separate MC/team/presentation browser contexts use isolated storage and mocked Edge transport, real React rendering. Covers live ordered queue, running/paused/step/reset/reconnect, read-only projector, free debug, paid retry, four-level progression, private results and manually staged reveal. Browser mocks do not prove hosted Supabase connectivity or latency.
- Real disposable PostgreSQL **17.11 and16.15** (PG17 full regression:48 PASS scenario groups; final focused V5:11 PASS groups on each version): V5 migration/rollback/reapply, five repetitions of eight-team concurrent first executions, six-way same-key replay charges once, four-way distinct-key race never exceeds two optimizations, downward aggregation, base60→final50, free failed runs, shorter equal-floor solution retention, optimum-change rejection. Canonical totals reconcile after every scenario.
- Three fault boundaries (validation/attempt/aggregate): attempts, fees and totals roll back together; retry then charges exactly once. End-stage and revocation races force both lock orders, three repetitions each; rejected requests change no scores. No unresolved lock waits/deadlocks.
- Full prior V1/V2/V3/display regression also runs on PG17: original200-vs100 defect, eight-team isolation, room/team authorization, deadlines, idempotency, immutable stages, token revocation, RLS/grants, website fingerprints. V5 full eight-team6+4 flow reconciles maximum600/400→100, exact ranking/ties, private/public projections and demo versioning with zero official attempt side effects.
- Custom-format pg_dump/pg_restore rehearsed locally: canonical attempts, aggregate totals, legacy identity and restricted grants survive. Rollback refusal after V5 use verified. No production backup/restore or migration dry-run executed.
- Local eight-team state-RPC samples varied roughly16–31ms across runs, not a hosted performance promise. Test evidence logs are local `.local-audit/v5-*.log` and may contain synthetic identifiers; they are not committed.

## Screenshots and visual findings

All16 required screenshots were captured and inspected, using synthetic teams/credentials. Exact paths are the following pairs:

| State | Desktop1440×900 | Mobile390×844 |
| --- | --- | --- |
| MC queue | `artifacts/ui-review/v5/desktop-01-mc-demo-queue.png` | `artifacts/ui-review/v5/mobile-01-mc-demo-queue.png` |
| Matching presentation queue | `artifacts/ui-review/v5/desktop-02-presentation-demo-queue.png` | `artifacts/ui-review/v5/mobile-02-presentation-demo-queue.png` |
| Trace executing step2/N | `artifacts/ui-review/v5/desktop-03-demo-step-2.png` | `artifacts/ui-review/v5/mobile-03-demo-step-2.png` |
| Optimization fee | `artifacts/ui-review/v5/desktop-04-optimization-penalty.png` | `artifacts/ui-review/v5/mobile-04-optimization-penalty.png` |
| Private final rankings | `artifacts/ui-review/v5/desktop-05-private-results.png` | `artifacts/ui-review/v5/mobile-05-private-results.png` |
| Before public reveal | `artifacts/ui-review/v5/desktop-06-ceremony-before-reveal.png` | `artifacts/ui-review/v5/mobile-06-ceremony-before-reveal.png` |
| Champion | `artifacts/ui-review/v5/desktop-07-winner-reveal.png` | `artifacts/ui-review/v5/mobile-07-winner-reveal.png` |
| Explanation | `artifacts/ui-review/v5/desktop-08-winner-explanation.png` | `artifacts/ui-review/v5/mobile-08-winner-explanation.png` |

The screenshots are local review artifacts (Git ignored), not production screenshots. MC/score/private-result captures focus their relevant region; presentation captures are full-page and naturally taller on mobile. Queue and position/orientation match, command2 highlights correctly, public demo has zero editable controls. Found and fixed dark headings against the navy ceremony background; regenerated images show light/mint headings. Mobile layout stacks the QR below content, wraps controls with44px touch targets, and presents result cards above a horizontally scrollable comparison table. Document-level overflow checks pass; long explanations remain readable in a single column. No clipped command/score text seen in reviewed captures. QR uses synthetic localhost URL and its intentional local-only warning; scanning a real production domain/projector was not verified.

## Deployment gate and rehearsal

**Do not apply root pending migrations as a batch.** Older draft V4/QR/state-projection SQL is not part of this release. Last verified deployed history was original website migrations, ArenaV1/V2 and V3 under actual version `20261031191004` (not its root source filename). The isolated checkout generator preserves that actual version and includes only display-sync +V5 as pending:

```sh
python3 scripts/prepare-arena-deployment.py --v5 --function-source supabase/functions
```

Latest prepared local checkout: `/tmp/sayntax-arena-deploy-y5sdfjww`. Original website/Arena SQL hashes are verified unchanged. No remote commands run. A remote dry-run cannot be completed within the local-only authorization; it is an explicit next release gate, not a passed test.

After separate deployment approval: obtain a fresh backup and current history/source inventory, verify only these two migrations pending in the isolated checkout, review dry-run, apply SQL, run `verification-a11y-display.sql` and `verification-competition-v5.sql`, release the seven coherent JWT-verified functions, then approve frontend publication. Do not change migration history, secrets, CORS, JWT or main website. Rehearse with8 synthetic teams on separate phones: registration/recovery, two stages/deadlines, failure and optimization fees, live demo lag/reconnect, private results, tie resolution, every ceremony phase and physical projector QR readability. Ensure legacy workshops preserve their previous scoring.

## Readiness verdicts / remaining blockers

| Area | Verdict |
| --- | --- |
| Standalone gameplay / existing routes | GO for tested local regressions |
| V5 scoring/lifecycle and security | GO for local PostgreSQL evidence |
| MC dashboard / presentation / team identity | CONDITIONAL GO: local DB + mocked-browser verification; hosted rehearsal pending |
| Migration / rollback preparation | CONDITIONAL GO: local17/16 apply/rollback/restore pass; remote history/dry-run/backup review pending |
| Edge source | CONDITIONAL GO:22 tests and7 checks pass; coherent hosted deployment/integration pending |
| Production deployment | **NO-GO until approved backend release, frontend publication and hosted rehearsal** |

No known failing local test remains. Outstanding release work is fresh production inventory/backup and isolated dry-run; approved two-migration/seven-function/frontend deployment; real Supabase cross-device/8-team load and projector QR rehearsal. Browser mock synchronization and local DB timings must not be presented as production guarantees. Existing rooms do not acquire new scoring retroactively; create a new V5 competition after the approved release.
