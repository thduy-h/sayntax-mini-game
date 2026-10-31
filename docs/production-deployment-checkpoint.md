## Pending cross-device BEFORE/AFTER patch (2026-11-01)

> Deployment update 2026-11-01: user approved; both migrations and all7 Edge Functions deployed and hosted8-team API rehearsal passed. See [approved deployment record](competition-v5-deployment.md). Earlier local-only status below is historical.

> 2026-11-01 V5 update: V5 remains local-only. Use the isolated two-migration release bundle; do not apply older draft migrations or publish from this checkpoint. See [Competition V5 release review](competition-v5-release.md) for current rules, verification, screenshots and deployment gates.

Implemented locally; production unchanged. See [display sync audit and deployment gate](a11y-display-sync.md). Requires one additive migration and a minimal arena-manage-room redeploy from the reviewed 4/3 bundle, followed by frontend release. Do not apply unrelated root V4/QR/state-projection drafts. New migration checksum: `37ff1dfc2603b88357255ab42bdc75e9459c4c299191a4d00e87996108febacb`.

# Controlled production deployment checkpoint — 2026-10-30

## Latest production operation — Competition V3 4/3 synchronization hotfix

Explicit user approval: “deploy, áp dụng”. Exact original V3 SQL applied by MCP under actual version **20261031191004**, name `arena_competition_v3_sync_hotfix`, SHA-256 `40bb2fb472529aa968e0536e3ae6fa4494145d49110700350a92cc940fa07e0b`. Only `arena-manage-room` redeployed to platform revision 4 with JWT verification true; its old content/scoring preset was preserved. Six other functions remain revision 3. No 6/4 upgrade, setting change, website object change, frontend deployment or history repair.

Scoped Arena backup/restore rehearsal passed (13 tables/227 rows and old Edge source; not a full website/project backup). Postflight state for the authorized room reports 2/2 submitted, four Accessibility questions and three Robot levels; score invariant and grants checks passed. Website public/Auth metadata fingerprint stayed `e60e27a2932f1aca92739eed7f95f2bc`. Existing Stage 1 deadline elapsed normally; no time/score/state reset was performed. Hosted MC/participant rehearsal remains required; no overall production GO is claimed.

Details, recovery evidence and migration-history checkout warning: [MC control hotfix](mc-control-fix.md). Original filename `20261031010000_arena_competition_v3.sql` is the source for the applied timestamp, not another production migration to apply. Earlier checkpoint statements are historical.


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

## Competition V2 — current local candidate (2026-10-30)

V2 safety gate: baseline is reported deployed and remains unchanged. New migration 20261030165721 requires review/approval; all seven Edge Functions need approved redeployment, then frontend publication. No remote commands, settings changes, deploys or pushes were performed. Follow V2 backup/dry-run/rollback instructions, not historical baseline deployment steps.

[Competition V2 guide](competition-v2.md) contains the authoritative architecture, scoring, deployment gates, rollback and rehearsal instructions. Historical audit entries below describe earlier candidates.

Target: `hiuetzywfwudajaorqkx`. This is the existing SAYNTAX website project. **Production changes remain unauthorized.** No production migration, function deployment, setting change, backup export or frontend publication was performed in this checkpoint.

## Atomic scoring correction — controlling release assessment

The original candidate `63795dc55b91fc34bd11bc2b43833c3c5ec1e1e3717011d11a62a382d262d815` is superseded. Since Arena is **not deployed**, the existing `20261030100000_arena_schema.sql` was revised directly; no extra migration or history repair is needed. The two original website files are unchanged. New Arena SHA-256:

```text
3722ba18fa2583c59640e5165f69cf841f773c8881e30e1f15bf904bb221d65d
```

New isolated checkout: `/tmp/sayntax-arena-deploy-vai4x9uu`. Do not deploy the old `ke4ny70_` checkout. Revalidate the new manifest and deploy database/functions as one compatible release: the submission RPC is new and the MC RPCs now require their token hash.

### Root cause and atomic design

The old AFTER trigger ran `INSERT ... SELECT SUM(...) ON CONFLICT ... SET score=excluded.score`. Two transactions for different items calculated their sums from different MVCC snapshots before the aggregate conflict wait. After waiting, the second transaction overwrote the first committed total with its stale sum. Real PostgreSQL 17.11 regression: **canonical=200, leaderboard=100**; the invariant assertion fails (exit 1). This was a trigger defect, established by inspecting and replaying the actual old SQL, not inferred from an HTTP mock.

The trigger now ensures a zero aggregate row exists and uses atomic `UPDATE score = score + delta`, where delta is the new verified item contribution minus its old contribution. PostgreSQL applies this against the locked current row. It supports zero credit and changes to verification/contributions without stale SUM replacement.

Both submission handlers call **one `arena.process_submission` RPC** for all authoritative writes. It locks room **SHARE**, round **SHARE**, then team **UPDATE**; validates membership, current token hash/revocation/expiry, room expiry/status, active game, exact scoring snapshot/version and selected item; handles idempotency; inserts the attempt; inserts the first Accessibility answer or upserts the best Robot score; updates the aggregate via trigger; stores/returns the authoritative response. Any error rolls all writes back. Rate-limit accounting is deliberately separate and may persist for a rejected request; it never awards XP.

Room management/end/revoke takes room **UPDATE** first. Thus submission-before-admin counts; admin-before-submission rejects without an attempt/score. No new submission passes an already committed end/revocation. Token expiry uses `clock_timestamp()` after waits. Shared room/round locks allow different teams to proceed concurrently; team writes serialize only for that team. No multi-team bulk scoring RPC or lock upgrade is used. All future token mutators must use this protocol. Start/manage RPCs also recheck MC token under their room lock.

Idempotency is scoped to `(round_id, team_id, idempotency_key)` and bound to item/payload. A matching active authorized retry returns the original committed response with `duplicate=true`, including its **historical total at that commit**; polling supplies the latest total. Changed payload/key reuse rejects. Ended/revoked clients cannot use idempotency to bypass authorization. Accessibility first answer stays locked; Robot failures record zero-credit attempts only, successes retain one best canonical score/item; no bonus/speed scoring.

### Actual verification in this correction

| Check | Result / scope |
| --- | --- |
| Old SQL regression on PostgreSQL 17.11 | Expected FAIL: canonical 200 / cached 100, exit 1 |
| Fresh corrected SQL on PostgreSQL 16.15 and 17.11 | PASS on both, original website migrations applied first with a minimal synthetic Auth API fixture |
| Parallel SQL cases, each server | 10 repeats each: two items=200, four=400, same/different keys, Robot best retry/failure, eight-team cross-item isolation; nine concurrent joins admit eight |
| Trigger without RPC serialization | PASS: two separate concurrent inserts yield 200; decreasing score/verification deltas match canonical records |
| Round end and token revoke | PASS: both forced lock orders, 3 repeats each per server; rejected requests create no attempt/credit |
| Fault injection | PASS: after validation, after attempt insert, before aggregate, competing transaction abort; retry commits once |
| Team parallelism | PASS: another team commits while a submission holds team 0 locks |
| Auth/config/retries | PASS: expired/wrong token, expiry during wait, expired room, wrong content/version/item, key-payload mismatch, stable retry response |
| Database security/isolation | PASS: seven RLS tables, no browser schema/table/RPC access, invoker-only fixed-path routines, reduced service grants; public/Auth metadata fingerprints unchanged |
| Recovery/rollback | PASS: synthetic custom dump/restore with 200 XP in two scored rows and a synthetic website user, canonical totals/row recovery/browser denial, Arena rollback preserves 13 original website tables |
| Deno | 8 tests passed, including mocked Edge-to-RPC transport and trusted scoring; all seven entrypoints type-check |
| Application | Vitest 9 passed; TypeScript/lint script passed; build passed; Playwright 1 mocked MC/eight-team flow passed; dependency audit 0 vulnerabilities |
| Production MCP (read-only) | Correct project URL, PostgreSQL 17.6, default isolation read committed, no Arena schema, only website versions `20260309184500`, `20260412000000` |
| Revised candidate remote CLI dry-run | **NOT RUN: DB_URL is absent in this process**. Previous operator dry-run covers old hash only |

Commands for reproducible local evidence:

```bash
# Intentionally fails on the frozen, byte-identical pre-fix regression fixture.
nix shell nixpkgs#postgresql_17 -c bash scripts/test-arena-transactions.sh --regression
nix shell nixpkgs#postgresql_16 -c bash scripts/test-arena-transactions.sh
nix shell nixpkgs#postgresql_17 -c bash scripts/test-arena-transactions.sh
npm run test:edge
npx --yes deno check --node-modules-dir=none supabase/functions/arena-*/index.ts
npm run lint
npm test
npm run test:e2e
npm run build
npm audit --omit=dev
git diff --check
```

The database runner launches a disposable loopback cluster, never reads DB_URL, imposes statement/lock timeouts and asserts canonical totals after completed cases. Fault triggers exist only in that disposable database. It applies the actual website SQL to synthetic `auth.users`/`auth.uid()` fixtures; it does **not** emulate hosted Auth/Storage/PostgREST/gateway behavior. Browser E2E and Edge transport tests are mocked and do not prove a deployed full flow.

**CONDITIONAL GO for the corrected local release candidate; NO-GO for production workshop launch.** All three discovered transaction defects are fixed and verified locally. Remaining gates: new-hash direct-URL dry-run, actual backup/recovery evidence, approved origin/exposed schema, deployed JWT/CORS/API compatibility, real eight-team rehearsal and website smoke checks. No production changes were executed. Standalone gameplay source/design is unchanged and existing app checks pass; this test scope does not constitute a new exhaustive gameplay accessibility/mobile audit.

Shared infrastructure/service-role blast radius and legacy-anon-key availability remain operational risks. Grants are now only SELECT/INSERT/UPDATE on Arena tables, no sequences, EXECUTE on five required RPCs. All routines are SECURITY INVOKER with `search_path=pg_catalog`; browser grants remain absent. The Edge admin SDK now uses pinned `npm:@supabase/supabase-js@2.99.0`, avoiding the esm.sh runtime dependency that returned HTTP 520 during testing; bundling on the real platform remains a deployment gate.

## Safe validation commands — no migration execution

Use the prepared isolated checkout, refreshing only reviewed local assets if needed. Keep credentials in the operator's secure environment. Do not print DB_URL, enable shell tracing or publish raw CLI errors. `--db-url` expands into a process argument; run on a trusted single-user administration host and retain no credential-bearing logs.

```bash
set +x
ARENA_DEPLOY_DIR=/tmp/sayntax-arena-deploy-vai4x9uu
: "${DB_URL:?Set the tested Session Pooler URL securely; do not paste it into chat}"
npx --yes supabase@2.122.0 --workdir "$ARENA_DEPLOY_DIR" migration list --db-url "$DB_URL"
npx --yes supabase@2.122.0 --workdir "$ARENA_DEPLOY_DIR" db push --db-url "$DB_URL" --dry-run --skip-vault
```

Confirm project/Session Pooler identity in the secure operator configuration; use TLS. Do not replace the tested Session Pooler with transaction pooling. Accept only the two website versions applied and exactly the reviewed Arena version pending. Do not use `--linked`, `--include-all`, seed/roles flags, reset, repair or a SQL-editor workaround. `--skip-vault` prevents incidental Vault synchronization. Pin CLI 2.122.0 as already reviewed.

## Backup gate — operator procedure, not executed on production

1. Confirm a completed native project backup/PITR point, retention, recoverable timestamp and restoration procedure in Dashboard. Do not assume the current plan provides these features. Whole-project restore affects website users and requires the website owner's incident approval.
2. Provision no new project automatically. Select an existing authorized isolated Supabase-compatible restore target. No such target is configured for this checkpoint. Never point a restore command at production.
3. On the trusted operator host, provide private `PGSERVICEFILE` and `PGPASSFILE` (0600). Use service `sayntax_backup` for the tested Session Pooler endpoint and `sayntax_restore_test` only for the disposable restore target. Use validated TLS settings; keep host/user/password outside committed files/logs. Verify service identity and target separation privately. A pg_dump role must read all relevant schemas; a partial/failed dump is not a complete backup.
4. Use matching-major PostgreSQL 17 tools. On this host:

```bash
nix shell nixpkgs#postgresql_17 nixpkgs#age
```

Inside that shell, after securely supplying service/password files:

```bash
set +x
set -o pipefail
umask 077
ARENA_BACKUP_DIR=$(mktemp -d /tmp/sayntax-pre-arena-backup-XXXXXX)
psql --dbname=service=sayntax_backup -X --set=ON_ERROR_STOP=1 \
  --file="$ARENA_DEPLOY_DIR/supabase/preflight-readonly.sql" \
  > "$ARENA_BACKUP_DIR/preflight.txt"
pg_dump --dbname=service=sayntax_backup --format=custom \
  --file="$ARENA_BACKUP_DIR/database.dump"
pg_dumpall --database=service=sayntax_backup --roles-only --no-role-passwords \
  > "$ARENA_BACKUP_DIR/roles-no-passwords.sql"
pg_restore --list "$ARENA_BACKUP_DIR/database.dump" > "$ARENA_BACKUP_DIR/archive.contents"
sha256sum "$ARENA_BACKUP_DIR/database.dump" > "$ARENA_BACKUP_DIR/database.sha256"
```

Require exit 0 for each command. Run the native commands individually and stop at any error. `pg_dump` takes a consistent database snapshot but does not include role definitions; `pg_dumpall` roles export is a separate metadata snapshot and excludes role passwords. Managed-platform restrictions can prevent some exports: do not label the result complete without resolving or documenting coverage against a native restore point. Do not restore platform roles indiscriminately.

Encrypt with the organization's approved recipient (public key in environment), store the archive off-host and verify the checksum. Do not print the archive contents, commit data or leave the only copy in `/tmp`:

```bash
: "${ARENA_BACKUP_RECIPIENT:?Set the approved age public recipient}"
tar -C "$ARENA_BACKUP_DIR" -cf - . | age -r "$ARENA_BACKUP_RECIPIENT" \
  -o "${ARENA_BACKUP_DIR}.tar.age"
```

Use `set -o pipefail` in the operator shell so tar/encryption failures fail the gate. Record the native restore-point timestamp, archive checksum, encryption/off-host location and actual snapshot time privately. Securely retire plaintext according to host/storage policy after the restore test; checksum/listing alone do not prove recovery.

5. The custom dump includes database schemas, table data (including Auth metadata), routines, RLS and object ACLs; it does not contain Storage file bytes, Edge runtime secrets/source, project Auth/JWT settings or other Dashboard configuration. Retain approved backups/inventories of those separately, including existing exposed-schema settings and function inventory. Never rotate shared keys as a backup step.
6. On the **authorized isolated target**, have its administrator reconcile compatible platform extensions/roles and schema state. A full dump may conflict with preinstalled managed schemas. Do not use `--clean` or `--no-acl` as a shortcut; resolve restore compatibility on that isolated target. Once the target is prepared:

```bash
pg_restore --exit-on-error --single-transaction \
  --dbname=service=sayntax_restore_test "$ARENA_BACKUP_DIR/database.dump"
```

Retain owner/ACL restoration; do not discard grants to make restore appear successful. Validate expected schemas and all tables, row counts or private checksums, foreign keys, roles/ACLs, public RLS/policies/functions/Auth triggers, Auth functionality and website smoke flows. Test actual recovery time against the agreed RTO and snapshot age against RPO. New writes after the snapshot are not recoverable from a logical dump alone; use PITR or an approved maintenance strategy for that risk.

**Evidence today:** only synthetic PostgreSQL 17 restore/rollback passed. It does not include real Auth/Storage integration, real backups, managed role restoration or an actual native project restore. Those remain required operator evidence or an explicitly documented owner risk decision.

## Verification and rollback review

`supabase/preflight-readonly.sql` is read-only metadata SQL and works before Arena exists. Save all result sets; after deployment compare public relation/policy/function and public/Auth trigger fingerprints. It also records migration versions.

`supabase/verification.sql` is read-only and intentionally requires Arena to exist. Expect exactly seven tables, all RLS enabled, no PUBLIC/anon/authenticated function grants, false effective schema/table/RPC access for browser roles and service-role runtime privileges. Trigger-only routines need not be exposed as service-role RPCs. Run it only after an approved migration; it does not exercise HTTP authorization or scoring.

The executable rollback SQL was rehearsed locally on synthetic data (comments updated for this release): `BEGIN; DROP SCHEMA IF EXISTS arena CASCADE; COMMIT;`. It is destructive. A DBA must inventory cross-schema dependencies before using it: CASCADE can drop external objects added later. No such production dependency graph exists yet because Arena is absent; do not claim this remains true after rollout.

Preferred rollback is disabling Arena traffic/frontend while preserving data and the running website. A destructive rollback requires a fresh Arena dump, stopped endpoints, reviewed dependency inventory and **separate explicit approval**. Using the tested connection method, the manual database command would be:

```bash
psql --dbname="$DB_URL" -X --set=ON_ERROR_STOP=1 \
  --file="$ARENA_DEPLOY_DIR/supabase/rollback/20261030100000_arena_schema.rollback.sql"
```

Do not execute it now. Do not repair migration history; dropping the schema does not remove the applied migration record. A later reinstallation needs a reviewed forward migration. Function deletion, removal of Arena-only API schema exposure or secret, and full project restore each need separate approval and must preserve website settings/data.

## Production change commands — approval required; do not execute now

All gates above must pass first. The corrected SQL has passed local transaction/security tests, but the command below remains **not approved to run** until the new-hash dry-run, recovery and authorization gates pass. Recheck the final reviewed manifest.

```bash
npx --yes supabase@2.122.0 --workdir "$ARENA_DEPLOY_DIR" db push --db-url "$DB_URL" --skip-vault
```

Immediately afterward, the approved operator would run:

```bash
psql --dbname="$DB_URL" -X --set=ON_ERROR_STOP=1 --file="$ARENA_DEPLOY_DIR/supabase/preflight-readonly.sql"
psql --dbname="$DB_URL" -X --set=ON_ERROR_STOP=1 --file="$ARENA_DEPLOY_DIR/supabase/verification.sql"
```

The seven individual function deployment commands, CORS and Pages configuration are in `docs/shared-supabase-migration.md`. Use only the new checkout containing paired RPC and Edge changes; database commands use `--db-url`. Check these before enabling participant traffic:

- Append `arena` to Dashboard exposed schemas, preserving the existing list. This requires approval and enables service-role PostgREST custom-schema calls; it grants no browser table permission.
- All seven functions have `verify_jwt=true`. Use the enabled legacy anon JWT in `VITE_SUPABASE_ANON_KEY`. Publishable-only anonymous calls cannot satisfy this gateway policy. Keep independent MC/team headers, no Auth participant accounts; never put those tokens in Authorization or weaken JWT verification.
- Platform-only `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` exist in Edge runtime and are never in Vite/Cloudflare. Service-role endpoint auth remains necessary despite BYPASSRLS.
- Set exact approved HTTPS `ARENA_ALLOWED_ORIGIN`, no slash/path/wildcard. The actual final domain has not been supplied. Test allowed/disallowed preflight and POST; CORS is not authorization.
- Pages build: Node 22, `npm ci`, `npm run build`, `dist`; public URL points to `hiuetzywfwudajaorqkx`, key is its enabled legacy anon JWT; rebuild after env changes. Verify no secret/service-role values in the bundle and no fake data fallback when configured.
- Real gateway tests: missing/invalid JWT → gateway rejection; valid anon JWT plus invalid team/MC token → function denial; valid credentials → expected state; all configured CORS headers verified with browser requests.

## Eight-team gate and approvals

Use `docs/workshop-rehearsal.md`: one MC, eight independent teams, ninth rejected; join before lock; four questions/three levels frozen; exact canonical XP, **different-item concurrent totals**, duplicate/crash retries, end-round/revocation races, offline/reconnect, at most one in-flight poll per client, convergence within 10 seconds on a healthy network, and unchanged main-site smoke/fingerprints. Expired token/room tests must run in isolated rooms/environment, never by changing shared project security settings.

No actual rehearsal may write to this production project without approval. An authorized staging rehearsal should precede production changes; production acceptance follows in a controlled test room after separately approved deployment.

Approval still required for: migration; exposed-schema change; setting the origin secret; each Edge Function deployment; frontend publication; production rehearsal/test writes; real personal-data export and isolated restore as applicable; any destructive rollback or project restore. No routine local preparation approval is needed. Stop at this gate; do not treat the successful connection dry-run as permission to deploy.


## Competition V2 backend correction — 2026-10-31

Production `/competition/undefined` was caused by a response-contract mismatch: the deployed V1 `arena-create-room` returned `{room, mcToken}` instead of the V2 `{competitionId, mcToken}`. The old missing-session message did not identify this cause. The frontend now validates the response before saving credentials/navigation, rejects legacy/malformed success payloads, and offers recovery to `/competition` for invalid links without granting MC authority.

With explicit operator approval, all seven existing Arena Edge Functions were redeployed to project `hiuetzywfwudajaorqkx` from reviewed backend commit `6b8d676d7cb0f93d14061c4f6e6c066288699128`. All seven report version **3**, **ACTIVE**, and **verify_jwt=true**. Downloaded entrypoints and every reachable relative dependency were compared byte-for-byte with that commit and matched. This correction did not change database objects, settings, CORS, secrets or website source. The already-applied V2 migration was not rerun.

Frontend regression evidence: Vitest **29 passed** (5 files); focused Competition Playwright **12 passed** on desktop/mobile, including mocked eight-team lifecycle, rejected legacy response, malformed routes, presentation denial and absence of MC authority from a URL alone. TypeScript checking and production build passed. Browser Edge transport is mocked; these results do not constitute a real hosted eight-team rehearsal. No production competition/test rows were created in this correction.

Backend source deployment is verified. Hosted JWT/CORS/DB integration through a real competition, eight-team rehearsal and website smoke checks remain operational gates. A complete production backup/restore has not been verified. Production competition verdict remains **CONDITIONAL GO pending hosted rehearsal**, not production GO. Open `/competition` to create a new competition after the frontend rollout; `/competition/undefined` cannot identify or recover a real competition.
