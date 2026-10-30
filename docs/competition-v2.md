# Competition V2 — local implementation and operator guide

## Deployment update — 2026-10-31

The operator reports all seven Competition V2 Edge Functions have been deployed and has explicitly requested pushing the frontend/source to `thduy-h/sayntax-mini-game`. The V2 database migration is applied as recorded below. This update does not independently verify deployed function versions or hosted end-to-end behavior; the real eight-team rehearsal and website smoke checks remain outstanding. Previous statements that function deployment was still pending describe the earlier checkpoint.

## Production migration applied — 2026-10-30

The user explicitly approved migration execution ("cứ migrate đi"). Supabase MCP applied the exact reviewed V2 SQL successfully to `hiuetzywfwudajaorqkx`. MCP recorded version **20261030165721**, name `arena_competition_v2`. The previously planned local version was 20261030180000; local migration/rollback filenames and references now match the actual version. No remote migration-history repair occurred. SQL SHA-256 remains `14248a881261f032883204219dd5ad34c24e5bd3a0104914cdfc4f5302758b10`; baseline remains unchanged.

Remote history now has four versions: 20260309184500, 20260412000000, 20261030100000, 20261030165721. Do not apply V2 again under another version. The isolated checkout generator now includes these four matching files; no migration should be pending if history remains unchanged.

Live post-migration read-only checks: 13 Arena tables, all RLS enabled; no browser schema/table/RPC grants; zero unsafe definer/search_path functions, aggregate mismatches, finalized snapshot mismatches, invalid winners or overfull competitions. All 22 live Arena function bodies match reviewed local SQL. Website public/Auth object/RLS/ACL/function/trigger fingerprint stayed `014ee5a5db4b5e1e2fb6230c8471ea77`. This is metadata verification, not a website browser smoke test. No competition or rehearsal rows were created.

Pre/post Arena metadata snapshots were saved locally outside source control. These contain no table rows and are **not a full database backup**. No full production pg_dump/provider restore point could be verified through the available MCP; no production restore rehearsal was performed. Local disposable dump/restore and rollback evidence remains as previously recorded.

Only the database migration was authorized/executed. Edge Functions, frontend, CORS/JWT/project settings remain untouched. Seven Edge redeploys, frontend publication and real hosted rehearsal are still required; full V2 workshop production readiness remains NO-GO. Historical statements below about an unapplied V2 or a blanket production connection ban describe the preceding task and are superseded by this checkpoint.

This document supersedes older single-room/undeployed-baseline instructions for the two-stage competition. The operator reports baseline `20261030100000` and all seven functions are deployed. This task did not contact production, inspect hosted configuration, migrate, deploy, publish or push. Hosted functionality remains unverified for V2.

## Data and transactions

An additive `20261030165721_arena_competition_v2.sql` migration introduces competitions, competition_teams, competition_stages, competition_results, competition_recovery_requests and competition_tie_answers, plus rooms.competition_id and teams.competition_team_id. Every object is in `arena`. Website SQL, tables, policies, Auth triggers and project settings are untouched. New V2 SQL SHA-256: `14248a881261f032883204219dd5ad34c24e5bd3a0104914cdfc4f5302758b10`. Baseline SQL remains SHA-256 `3722ba18fa2583c59640e5165f69cf841f773c8881e30e1f15bf904bb221d65d`.

Two independent rooms, rounds and scoped team sessions share a stable competition_team_id. Registration pre-associates both rooms; Stage 2 cannot create a new competition team. Eight teams maximum. Competition/session expiry is 48 hours, recovery requests 15 minutes, presentation capabilities at most 8 hours.

Lock order: **competition → stage → room → round → room-team → attempts/canonical submissions/aggregate**. Independent submissions use SHARE parent locks and UPDATE only their own team. Lifecycle and recovery acquire competition UPDATE, excluding submissions until state/token changes commit. Deadline/token validation is repeated after team lock acquisition. Attempt, idempotency, canonical best score, aggregate delta and response are one RPC transaction. Finalization waits for prior accepted submissions and snapshots canonical records atomically. Results reject UPDATE/DELETE. Legacy functions are retained as process_workshop_submission, start_workshop_round and apply_workshop_room_action behind dispatch wrappers; legacy routes reject competition rooms.

All new functions use SECURITY INVOKER and search_path=pg_catalog. PUBLIC/anon/authenticated have no Arena schema/table/RPC access. Only trusted service_role can invoke scoring functions; Edge Functions validate capabilities and calculate scores. RLS is enabled with no browser policies. Service-role is deliberately trusted: SQL validates bounds/config/tokens but cannot protect against a compromised backend submitting a fraudulent verified score. Keep its credential solely in the Edge runtime.

## Gameplay and fairness

Practice remains independent and retains original scoring/content. Competition uses server-only question variants, preserving all 12 learning objectives with more plausible distractors. Four frozen questions, same order/options for all teams, 100/50/0 XP, maximum 400. Default: contrast, captions, language (form errors), navigation. No answer/explanation or per-question score is returned during Stage 1; neutral confirmation only. Review opens after MC finalizes.

Robot preset is levels 6 → 4 → 7, shortest BFS counts 9 → 12 → 12. MC may choose another three of the nine curated maps. Frozen public maps contain no par/solution metadata. Only forward/left/right, 24 commands maximum. Authoritative simulation stops at the first goal and counts executed commands. Failure 0; success max(60,100−8×max(0,executed−BFS shortest)). Each level keeps only the highest verified score; retries never accumulate. Ghost Path is available only in finalized review. No solver/answer modules are imported by the competition frontend; practice is lazy-loaded separately. This cannot prevent teams solving the puzzle themselves or inspecting publicly available practice maps.

Deadlines are shared server timestamps: Accessibility 600 seconds, Robot 900 seconds. Client countdown uses server time anchored to monotonic performance.now(). Server rejects late submissions even if UI is stale. Expiry stops submission automatically; MC explicitly finalizes to publish stage totals. No speed bonus.

Only finalized stage snapshots enter the overall leaderboard: Accessibility/8 + Robot/6 = /100, equal 50-point weighting. Integer 3*A+4*R determines ranking, avoiding rounded-score ties. Then compare perfect Accessibility answers, then optimal Robot levels. Remaining tied candidates play deterministic three-minute sudden-death questions. Missing answers score zero after its deadline. If still tied, repeat another deterministic challenge; no random/manual winner override. Publication is blocked until exactly one candidate exists. A prolonged tie can exceed the normal agenda; MC must reserve award-buffer time. Sudden-death results change ranking, not the normalized /100 score.

## Identity and capabilities

Participant receives a random recovery credential generated using Web Crypto. Only SHA-256 hashes are persisted in PostgreSQL. Recovery card download/copy is explicit; room session tokens are stored in sessionStorage, never URLs. Closing the browser does not lose scores. On another device, the team opens the Stage 2 link and enters its recovery credential; it gets the same stable identity and a new room-scoped token. Display names are labels, never authentication. Restoration rotates the prior room token.

Lost credential: participant enters competition team ID, generates a recovery request, and shows the request ID to MC. MC verifies the team **in person** before approving. Approval rotates the stored recovery hash and revokes both old room sessions. MC is not given the recovery secret or a participant session. Participant then restores with its locally generated replacement credential. If team ID/card is lost, MC can read the team's ID from the control data; never approve solely on a matching name or unsolicited request.

The MC session is bound to the creating browser session. There is no MC account-based cross-device recovery in V2. Keep that browser/session available; do not clear storage during a workshop. All capability-bearing devices/cards are credentials: protect them and do not post screenshots publicly.

Presentation uses a separate high-entropy capability, stored hashed server-side, revocable/rotatable by MC. The URL places it in a fragment; the browser sends it in POST bodies, never query strings. Referrer policy is no-referrer. Public projection returns competition name/state/time and the current public prompt/map only, with no roster/private submissions/correctness/score key/solver information. Spectators cannot use a presentation token as an MC/team token. API responses use no-store. Already-viewed content cannot be erased from a spectator device by revocation.

## Frontend and polling

- `/competition`: create competition.
- `/competition/:id`: MC control center, read-only preview, configuration, stage/presentation/recovery/award controls.
- `/join/:code?competition=:id`: competition registration/restoration. `competition` is a public identifier, not a credential. Use the generated QR/link intact.
- `/present/:id#token=...`: read-only presentation, waiting/active/completed states.
- Bare `/join/:code`: existing workshop experience; homepage/free play preserved.

Vercel SPA rewrite remains in vercel.json. MC cannot render participant submit/run controls. Presentation options are noninteractive cards. Participants only play their scoped stage. Five-second polling cleans up timers/listeners, retries after offline/errors, restores sessions and ignores older overlapping responses. Nominal state traffic for one MC, eight teams and one presentation is 120 state requests/minute (108 without presentation), plus action requests; MC/team reads invoke one rate-limit RPC and one state RPC; presentation reads invoke two rate-limit RPCs and one state RPC. Shared spectator capability budget is 600/minute, with 300/minute per capability/address; MC/team budgets remain 60/minute per credential. Nine presentation screens sharing a NAT are covered by the transport regression test. This is a calculated bound, not hosted load measurement. More spectators multiply traffic; rehearse the expected audience. No fake leaderboard fallback in configured competition mode.

## Local verification commands

```sh
npm run lint
npm test
npm run test:edge
npx --yes deno check --node-modules-dir=none supabase/functions/*/index.ts
npm run test:competition
nix shell nixpkgs#postgresql_16 -c bash scripts/test-arena-competition.sh
PLAYWRIGHT_EXECUTABLE_PATH=/etc/profiles/per-user/thduy-h/bin/microsoft-edge npm run test:e2e
npm run build
npm audit --audit-level=moderate
node scripts/verify-arena-gateway-headers.mjs
git diff --check
```

Do not run a separate build concurrently with Playwright: its preview server serves dist, so replacing build assets/environment mid-run invalidates results. PostgreSQL scripts create loopback-only disposable clusters, do not consume production DB_URL and load original website migrations with a synthetic Auth fixture. They exercise real parallel connections, not mocked promises. Playwright mocks Edge transport; it verifies browser wiring but does not prove hosted Supabase end-to-end behavior. Synthetic gateway checks do not prove hosted JWT acceptance.

## Deployment sequence — approval required, NOT executed

1. Review V2 SQL, rollback, verification and checksums; run the local suites. Build an isolated checkout using `python3 scripts/prepare-arena-deployment.py`. It copies the **original** two website migrations, unchanged deployed Arena baseline, V2 migration and seven functions, no env files. Use its printed path and inspect migration-manifest.json. Never use old temporary checkouts.
2. Obtain explicit approval for backup access, production migration, each function deployment and frontend publication. Keep DB_URL in a private shell/session; no echo, shell tracing, command output containing it, chat or source control. Prefer an existing secure pgpass/service configuration for native PostgreSQL commands. The tested Supabase CLI method is `--db-url "$DB_URL"`, not the problematic linked login role. Confirm CLI version/help before use.
3. Before writes, take an encrypted/access-controlled provider backup and native full custom-format database dump, plus roles metadata, and record timestamp, server/pg_dump versions, checksum and restore output. Use a compatible pg_dump major version (17 for hosted PG17). Template: `pg_dump --format=custom --file="$ARENA_BACKUP" --dbname="$DB_URL"`. `pg_dumpall --roles-only --dbname="$DB_URL"` may require unavailable managed privileges; record the limitation and use the provider recovery mechanism. Never restore roles onto shared production. Dumps include website personal data: do not inspect or expose rows. Rehearse `createdb arena_restore_rehearsal` then `pg_restore --exit-on-error --dbname=arena_restore_rehearsal "$ARENA_BACKUP"` in an isolated compatible instance. Managed Auth/extensions/ownership may need an isolated Supabase environment. Plain PostgreSQL tests here use only synthetic data; they are not a rehearsal of a real production backup. Verify website metadata, Arena grants and canonical scores in the restored environment. Never target production with a restore command.
4. In the isolated checkout run `supabase migration list --db-url "$DB_URL"`, then `supabase db push --db-url "$DB_URL" --dry-run`. V2 is now applied: expect zero pending migrations and all four reviewed versions applied. Stop if V2 appears pending under a second filename. The original pre-apply expectation was exactly one V2 migration. Stop for any mismatch; no history repair/placeholders/include-all. These remote checks were deliberately not run during this local-only task.
5. **Completed via MCP on user approval; do not run db push to reapply V2.** The original reviewed CLI alternative was `supabase db push --db-url "$DB_URL"` from the isolated checkout. Do not modify exposed schemas (arena is reported already exposed), Auth, website tables or roles. Run `psql -X -v ON_ERROR_STOP=1 --dbname="$DB_URL" --file=supabase/verification-competition-v2.sql`. Expected violation queries empty, browser schema grants false; compare website metadata with preflight. Existing verification.sql contains V1 function-count assumptions and is historical; use the V2 verification for V2.
6. Preserve `verify_jwt=true` on every endpoint. The browser must send the project's valid legacy anon JWT in both apikey and Authorization Bearer headers (SDK does this for legacy keys). An sb_publishable key alone is not a JWT and does not satisfy this gateway. If legacy anon JWT is unavailable, proper Supabase Auth JWT integration is a separate blocker; do not disable verification. Gateway authorization and Arena team/MC capabilities serve different purposes. Verify actual production request headers privately and gateway responses after deployment. No service-role key in Vercel, VITE variables or browser.
7. Confirm existing ARENA_ALLOWED_ORIGIN equals the exact HTTPS frontend origin, without path/trailing slash; no wildcard. Existing service runtime SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are trusted only. Do not change CORS/secrets in this task. A needed change requires separate approval. Deploy the following **individually after approval**, from reviewed checkout:

```sh
supabase functions deploy arena-create-room --project-ref hiuetzywfwudajaorqkx
supabase functions deploy arena-join-room --project-ref hiuetzywfwudajaorqkx
supabase functions deploy arena-manage-room --project-ref hiuetzywfwudajaorqkx
supabase functions deploy arena-start-round --project-ref hiuetzywfwudajaorqkx
supabase functions deploy arena-submit-accessibility --project-ref hiuetzywfwudajaorqkx
supabase functions deploy arena-submit-robot --project-ref hiuetzywfwudajaorqkx
supabase functions deploy arena-get-state --project-ref hiuetzywfwudajaorqkx
```

No new endpoint. All seven require redeployment. Do not use --no-verify-jwt. Migration first, functions second, frontend last; pause workshops during rollout to avoid mixed versions. Rollback frontend/function source together if aborting. Existing workshop functions remain usable after additive migration.

8. Frontend: VITE_SUPABASE_URL=https://hiuetzywfwudajaorqkx.supabase.co, VITE_SUPABASE_ANON_KEY=<legacy public anon JWT provided privately>. Build with these values and publish only after explicit approval. Never set a service-role VITE/Vercel value. Preserve Vercel SPA rewrite; check homepage, bare join, competition join and presentation directly and after refresh on mobile.
9. Run the eight-team rehearsal below with actual Supabase and production-equivalent deployment. Compare original website smoke checks before/after. Only then assess production GO.

## Rollback

Prefer stop usage/forward fix if real results exist. Save a fresh full backup plus V2 archive before rollback. Rollback SQL is intentionally destructive to V2-only competitions, teams, rounds, attempts and scores; legacy Arena and website remain. It refuses without an explicit session confirmation. After separate rollback approval, run with psql in the same session: `SET arena.confirm_v2_rollback='reviewed-backup';` followed by `supabase/rollback/20261030165721_arena_competition_v2.rollback.sql` (use psql -f or \i). Restore matching pre-V2 Edge/frontend versions. Do not run baseline rollback and do not repair migration history automatically. Stopping code and reverting DB needs an operator-reviewed reconciliation plan, because Supabase history still records V2. Whole-project restore is last resort, affects the main website, and requires separate authorization and provider recovery plan.

## Eight-team rehearsal (Vietnamese)

1. MC mở `/competition`, tạo cuộc thi; kiểm tra hai mã phòng riêng, 4 câu / 3 màn mặc định, không có nút nộp bài trong MC.
2. Tám thiết bị đăng ký phiên 1, lưu thẻ; thiết bị thứ chín bị từ chối. Không khôi phục bằng tên. Thử credential sai và token đội dùng cho MC: phải bị từ chối.
3. Mở QR Presentation trên thiết bị không đăng ký. Đổi câu ở MC, màn hình cập nhật trong một chu kỳ polling. Kiểm tra response không có đáp án, điểm từng lựa chọn, solver hay roster. Thu hồi/tạo lại link; link cũ bị từ chối.
4. Phiên Accessibility **10 phút**: tất cả đội cùng 4 câu/thứ tự; neutral confirmation, không lộ đáp án. Gửi lặp/concurrent không nhân XP; hết deadline bị từ chối. MC chốt một lần; review mở, bảng **TẠM THỜI**, tối đa50; không có overall winner.
5. Đóng toàn bộ trình duyệt đội trong Workshop Session 2. Giữ phiên MC. Trên thiết bị mới mở QR phiên 2, nhập thẻ; đủ đúng tám ID cũ và giữ điểm phiên1. Thử mất thẻ: yêu cầu mới → MC xác minh trực tiếp → duyệt → credential/token cũ bị thu hồi.
6. Phiên Robot **15 phút**: ba bản đồ giống nhau; không Ghost/optimal hint. Kiểm tra thất bại0, tối ưu100, hai lệnh dư84, sàn60; retry thấp không ghi đè. Hai đội nộp song song, đổi mạng/mất mạng rồi reconnect không mất điểm.
7. MC chốt Robot; kiểm tra điểm SQL canonical, snapshot và /100 khớp; 400 Accessibility=50, 300 Robot=50. Thử submit sau chốt và chốt lặp: từ chối. Hòa → merit tie-break → sudden death nếu cần → chỉ một winner mới cho công bố.
8. Refresh MC/team/presentation/nested routes trên điện thoại. Kiểm tra website chính login, trang học và progress vẫn hoạt động. Ghi lỗi, latency/poll frequency/gateway/HTTP status và invariant verification; không ghi credential/payload riêng tư.

GO requires: every local gate passing; reviewed backup with compatible restore evidence; exactly one reviewed V2 migration pending; explicit deployment approvals; JWT/CORS/grants verified on hosted runtime; eight-team real flow/deadline/race/recovery/tie/presentation checks passing; website smoke checks unchanged; one unique immutable winner. Any score mismatch, credential leak, browser privileged access, wrong team restore, late accepted submission, disabled JWT or website regression is NO-GO. Hosted behavior not yet verified is a deployment blocker, not a pass.
