# Shared Supabase deployment runbook

> 2026-11-01 V5 update: V5 adds new migrations without editing applied SQL. The release bundle preserves the deployed V3 version and excludes the older V4/QR/projection drafts. See [Competition V5 release review](competition-v5-release.md) for current rules, verification, screenshots and deployment gates.

## Competition V3 — local correction (2026-10-31)

New additive local-only migration `20261031010000_arena_competition_v3.sql`, SHA-256 `40bb2fb472529aa968e0536e3ae6fa4494145d49110700350a92cc940fa07e0b`. V1/V2 deployed migrations remain unchanged. No new endpoint/schema/settings/env required. Prepare coordinated migration, seven shared-source function redeployments and paired frontend only after review/approval; avoid an active workshop. Verification: `supabase/verification-competition-v3.sql`; guarded rollback: `supabase/rollback/20261031010000_arena_competition_v3.rollback.sql`. No remote migration-list or dry-run was performed for this patch.

Current operation/security/deployment gate: [V3 guide](competition-v3.md). V2 sections below describe the prior release.

## Production migration applied — 2026-10-30

The user explicitly approved migration execution ("cứ migrate đi"). Supabase MCP applied the exact reviewed V2 SQL successfully to `hiuetzywfwudajaorqkx`. MCP recorded version **20261030165721**, name `arena_competition_v2`. The previously planned local version was 20261030180000; local migration/rollback filenames and references now match the actual version. No remote migration-history repair occurred. SQL SHA-256 remains `14248a881261f032883204219dd5ad34c24e5bd3a0104914cdfc4f5302758b10`; baseline remains unchanged.

Remote history now has four versions: 20260309184500, 20260412000000, 20261030100000, 20261030165721. Do not apply V2 again under another version. The isolated checkout generator now includes these four matching files; no migration should be pending if history remains unchanged.

Live post-migration read-only checks: 13 Arena tables, all RLS enabled; no browser schema/table/RPC grants; zero unsafe definer/search_path functions, aggregate mismatches, finalized snapshot mismatches, invalid winners or overfull competitions. All 22 live Arena function bodies match reviewed local SQL. Website public/Auth object/RLS/ACL/function/trigger fingerprint stayed `014ee5a5db4b5e1e2fb6230c8471ea77`. This is metadata verification, not a website browser smoke test. No competition or rehearsal rows were created.

Pre/post Arena metadata snapshots were saved locally outside source control. These contain no table rows and are **not a full database backup**. No full production pg_dump/provider restore point could be verified through the available MCP; no production restore rehearsal was performed. Local disposable dump/restore and rollback evidence remains as previously recorded.

Only the database migration was authorized/executed. Edge Functions, frontend, CORS/JWT/project settings remain untouched. Seven Edge redeploys, frontend publication and real hosted rehearsal are still required; full V2 workshop production readiness remains NO-GO. Historical statements below about an unapplied V2 or a blanket production connection ban describe the preceding task and are superseded by this checkpoint.

## Competition V2 — current local candidate (2026-10-30)

For current V2 deployment use the guide below, not historical one-pending-baseline instructions. The new isolated checkout includes both original website migrations, unchanged deployed baseline and additive 20261030165721. Expected pending migration after operator confirmation: V2 only. No remote list/dry-run was executed in this task.

[Competition V2 guide](competition-v2.md) contains the authoritative architecture, scoring, deployment gates, rollback and rehearsal instructions. Historical audit entries below describe earlier candidates.

## Current checkpoint — 2026-10-30

See `docs/production-deployment-checkpoint.md` for the controlling approval gate and full atomic correction evidence. Three transaction defects are fixed and verified against real disposable PostgreSQL 16/17. Arena migration is revised, SHA-256 `3722ba18fa2583c59640e5165f69cf841f773c8881e30e1f15bf904bb221d65d`. Only this new candidate/checkout may be considered; the previous operator Session Pooler dry-run covered the old SQL and must be repeated. DB_URL is absent here, so no revised-candidate remote dry-run was executed. Production workshop remains **NO-GO pending new-hash dry-run, actual backup/recovery evidence, approved deployment and real rehearsal**.

## Earlier verified state — 2026-10-30

Target: `hiuetzywfwudajaorqkx` (`https://hiuetzywfwudajaorqkx.supabase.co`). This is the main production website project. No Arena migration, function deployment, setting change, or migration-history repair was performed.

CLI: **2.122.0**, available via `npx`; no global `supabase` binary. `link`, `migration list`, `db push`, `functions deploy`, `db dump`, and `secrets set` help were inspected. The commands below pin this version. `--dry-run`, `--skip-vault`, `--linked`, `--workdir`, and `--use-api` are supported. Do not use `--include-all`, `--include-seed`, `--include-roles`, `--prune`, or `--no-verify-jwt`.

The new isolated checkout (local preparation only; explicit project ref is used for function commands) is:

```text
/tmp/sayntax-arena-deploy-vai4x9uu
```

It contains these byte-for-byte copies; original website sources are in `/home/thduy-h/Documents/TD/SAYNTAX/supabase/migrations`:

| Order | File | SHA-256 |
| --- | --- | --- |
| 1 | `20260309184500_initial_schema.sql` | `0e831bcb0a81e8b081af99289198d084203fe5473d08867305ff56e7d8612325` |
| 2 | `20260412000000_lesson_v2_progress.sql` | `c4c0ad5e82eae9866428d576adcaba8e4ccf68530c7e707fdcae12152f425057` |
| 3 | `20261030100000_arena_schema.sql` | `3722ba18fa2583c59640e5165f69cf841f773c8881e30e1f15bf904bb221d65d` |

The checkout includes all seven function sources, shared helpers, rollback, preflight/verification SQL, a SHA-256 manifest, and explicit `verify_jwt = true` per function. No seed, website application source, credentials, or legacy Arena SQL was copied. The website files also already exist in the Game Arena repository and match the main originals; the previous audit's claim that they were missing was incorrect.

### Historical linked-connection result (superseded by operator Session Pooler checkpoint)

- `link --project-ref hiuetzywfwudajaorqkx`: **passed**; local linked ref verified.
- `migration list --linked`: **blocked**, exit 1.
- `db push --linked --dry-run --skip-vault`: **blocked**, exit 1, before migration planning.
- Both database commands fail during managed login-role initialization: permission denied to alter `cli_login_postgres` (requires CREATEROLE and ADMIN option). Raw errors are not reproduced because the CLI includes credential material in them. Do not use `--debug` or publish raw error logs.
- Read-only MCP independently confirms exactly two applied versions: `20260309184500` and `20260412000000`; `arena` is absent. Comparing those versions with the three local files yields exactly one pending version: `20261030100000`. **This is a metadata comparison, not a successful CLI dry-run.**

The `--linked` method failed during managed-role initialization; it is no longer the deployment path. The operator subsequently validated an existing Session Pooler connection and successful direct-URL dry-run without changing roles/history. Use only the tested `--db-url` method below; do not repair roles/history or retry managed-role initialization for this deployment.

## Reproduce the local checkout

Run from Game Arena:

```bash
python3 scripts/prepare-arena-deployment.py
```

This only copies original SQL and deployment assets into a fresh temporary directory and prints its path and checksums. It does not contact Supabase. Regenerate after any source change. `/tmp` is ephemeral; archive the reviewed source/manifest securely before an approved deployment.

Set the path printed by the script (for this session):

```bash
ARENA_DEPLOY_DIR=/tmp/sayntax-arena-deploy-vai4x9uu
```

Using the tested Session Pooler URL securely supplied in the operator environment, these are validation commands, not migration execution:

```bash
set +x
: "${DB_URL:?Supply the tested Session Pooler URL securely}"
npx --yes supabase@2.122.0 --workdir "$ARENA_DEPLOY_DIR" migration list --db-url "$DB_URL"
npx --yes supabase@2.122.0 --workdir "$ARENA_DEPLOY_DIR" db push --db-url "$DB_URL" --dry-run --skip-vault
```

Accept only a list matching the first two versions as local+remote and the third as local-only, followed by a dry-run listing only `20261030100000_arena_schema.sql`. A dry-run checks the pending list; it does not execute SQL or prove runtime correctness. Never run a migration reset/repair or replace the original SQL with placeholders.

## Migration candidate compatibility

Arena is absent live and version `20261030100000` is unapplied, so revise that migration directly; never change the original two website SQL files. This is a fresh-install candidate, not an in-place upgrade from the old Arena SQL. Do not apply it over a local database already containing old Arena functions/tables; recreate only the disposable local Arena database instead. No production history repair is permitted.

`submission_attempts` gains payload/response and a scoped unique key; `process_submission` replaces the old best-Robot-only RPC. Start/manage RPC signatures now require MC hash. Deploy matching reviewed Edge code before enabling traffic; old Edge handlers are incompatible. The rollback still drops only Arena (review CASCADE dependencies), does not revert migration history/settings/functions, and requires separate approval.

## Backup and recovery gate

The controlling full backup, encryption, native PITR, restore-target compatibility and recovery-evidence procedure is in `docs/production-deployment-checkpoint.md`. Production server 17.6 was confirmed read-only; PostgreSQL 17.11 via Nix provides a same-major Docker-free toolchain. A synthetic dump/restore and Arena rollback were rehearsed locally; no production data export or real hosted Supabase restore was performed. Listing an archive is not a restore rehearsal. Require actual backup/restore evidence before production approval.

## Approval gate: migration and custom schema

Do not execute the following until backup/restore evidence, successful dry-run, staging rehearsal and explicit production approval exist:

```bash
npx --yes supabase@2.122.0 --workdir "$ARENA_DEPLOY_DIR" db push --db-url "$DB_URL" --skip-vault
```

This applies only the reviewed Arena migration after the pending-list gate. Do not use the SQL editor as a shortcut around history validation; manually applying SQL without recorded history creates drift.

The Edge admin client uses PostgREST with `db.schema = arena`. In Dashboard **Project Settings → Data API/API → Exposed schemas**, append `arena`, retaining every existing entry. This is a production setting change requiring approval. The local checkout config does not change the remote exposed schemas.

Required permissions from the reviewed migration:

- `service_role`: schema USAGE; table SELECT/INSERT/UPDATE for handlers and trigger-maintained scores; EXECUTE on `consume_rate_limit`, `process_submission`, `start_round`, `apply_room_action`, and `expire_room_if_needed`. No DELETE/TRUNCATE/REFERENCES/TRIGGER or sequence privilege is granted. All routines are SECURITY INVOKER with fixed `pg_catalog` search_path. Service-role already has project-wide BYPASSRLS; these grants do not isolate a leaked service credential from the website. Trigger execution does not require exposing trigger routines as public RPCs. UUID defaults do not require sequences.
- `PUBLIC`, `anon`, `authenticated`: no Arena schema USAGE, table/sequence access, or function EXECUTE. All seven tables have RLS enabled with no browser allow policies. No browser Data API table access is needed.
- No changes to website grants/policies or Auth behavior. A service-role leak still affects the entire shared project; schema separation is not an isolated infrastructure boundary.

Run `supabase/verification.sql` after migration; all browser privilege booleans must be false, browser routine grants empty, all table RLS flags true, and service-role USAGE/table/RPC privileges present. The trigger-only functions need not be executable by service-role via RPC. Compare preflight website fingerprints before/after.

## API key and JWT gateway — corrected

The project exposes both an enabled legacy anon **JWT** and an enabled `sb_publishable_...` key. Neither value was printed. No production frontend environment was available to prove which key Cloudflare currently uses; local Arena `.env.example` is empty.

This deployment plan requires the **legacy anon JWT** in `VITE_SUPABASE_ANON_KEY`, with `verify_jwt=true` on all seven functions. Supabase client 2.118.0 was inspected/tested locally: unauthenticated legacy-key invocations send `apikey` and `Authorization: Bearer <anon JWT>`, preserving `x-team-token`/`x-mc-token` independently. Teams need no Auth account.

A publishable key is not a JWT. The installed SDK sends it in `apikey` and omits the bearer header when no Auth session exists; it cannot satisfy this plan's `verify_jwt=true` gateway. The earlier statement that a 'publishable JWT' would work was incorrect. Do not substitute a publishable key, put a team token in Authorization, disable verification, or rotate/revoke keys used by the main website. Adopting publishable keys later requires a separately reviewed per-function authorization design. Legacy-key lifecycle remains an external dependency; recheck availability/support before the workshop.

Local header contract test (synthetic keys and intercepted fetch; no network):

```bash
node scripts/verify-arena-gateway-headers.mjs
```

Reference: https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys (Edge Function JWT verification section). Real gateway acceptance is still unverified because no Arena endpoint is deployed. After an approved staging deployment verify missing/invalid bearer → 401; valid anon bearer without valid MC/team token → function denial; valid bearer plus correct team token → authorized state. Valid bearer plus fake arbitrary XP must never change scores. Test publishable-only calls are rejected under the chosen policy.

## CORS and backend secrets — approval required

Choose the exact final HTTPS Game Arena origin, with no path or trailing slash. It has not been supplied/verified. Preview deployments have different origins and require their own authorized environment; do not use a wildcard.

Create a private untracked file under the deployment checkout:

```env
ARENA_ALLOWED_ORIGIN=https://<approved-game-arena-domain>
```

```bash
npx --yes supabase@2.122.0 --workdir "$ARENA_DEPLOY_DIR" secrets set \
  --project-ref hiuetzywfwudajaorqkx \
  --env-file "$ARENA_DEPLOY_DIR/.env.arena-functions"
```

Do not override platform `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`; the admin helper reads them in Edge runtime only. Their deployed availability remains a staging check. The new `ARENA_ALLOWED_ORIGIN` secret is project-level but Arena-specific; do not alter existing secrets. CORS allows POST/OPTIONS and authorization, apikey, content-type, x-client-info, x-mc-token, x-team-token headers. Wrong browser origins must receive no allowed-origin response. Origin-less server requests still require application credentials; CORS is not access authorization.

## Seven individually executable deployments — approval required

Each command uses the isolated checkout, Docker-free API bundling, explicit target and per-function `verify_jwt=true`. Never omit the function name (that deploys all local functions).

```bash
npx --yes supabase@2.122.0 --workdir "$ARENA_DEPLOY_DIR" functions deploy arena-create-room --project-ref hiuetzywfwudajaorqkx --use-api
npx --yes supabase@2.122.0 --workdir "$ARENA_DEPLOY_DIR" functions deploy arena-join-room --project-ref hiuetzywfwudajaorqkx --use-api
npx --yes supabase@2.122.0 --workdir "$ARENA_DEPLOY_DIR" functions deploy arena-manage-room --project-ref hiuetzywfwudajaorqkx --use-api
npx --yes supabase@2.122.0 --workdir "$ARENA_DEPLOY_DIR" functions deploy arena-start-round --project-ref hiuetzywfwudajaorqkx --use-api
npx --yes supabase@2.122.0 --workdir "$ARENA_DEPLOY_DIR" functions deploy arena-submit-accessibility --project-ref hiuetzywfwudajaorqkx --use-api
npx --yes supabase@2.122.0 --workdir "$ARENA_DEPLOY_DIR" functions deploy arena-submit-robot --project-ref hiuetzywfwudajaorqkx --use-api
npx --yes supabase@2.122.0 --workdir "$ARENA_DEPLOY_DIR" functions deploy arena-get-state --project-ref hiuetzywfwudajaorqkx --use-api
```

Then read the deployed inventory and confirm JWT verification remains enabled for each:

```bash
npx --yes supabase@2.122.0 --workdir "$ARENA_DEPLOY_DIR" functions list --project-ref hiuetzywfwudajaorqkx
```

## Frontend deployment — approval required

Build the Game Arena repository, not the temporary Supabase checkout. Cloudflare Pages: Node 22, `npm ci` then `npm run build`, output `dist`.

```env
VITE_SUPABASE_URL=https://hiuetzywfwudajaorqkx.supabase.co
VITE_SUPABASE_ANON_KEY=<enabled legacy anon JWT from the target project>
```

Get the value securely from Dashboard; never paste credentials into chat/logs. No `sb_secret_...`, service-role value or database password belongs in Pages/Vite. Build-time env changes require a rebuild. Missing both values intentionally means standalone; configured backend failures must remain visible rather than produce fake scores.

## Post-deployment gate and rollback

Run all result sets in `supabase/preflight-readonly.sql` and `supabase/verification.sql`; verify the third history version, seven Arena tables, browser denial, required service grants, unchanged website fingerprints, and no public Arena objects. Follow `docs/workshop-rehearsal.md`; retain sanitized evidence. A successful migration alone never grants production GO.

First rollback option: stop Arena participant traffic and revert/disable only the Arena frontend. Preserve the new schema/data while investigating; leave the main website running. Do not rotate shared credentials, restore the whole project or remove shared API schemas to disable Arena.

For an explicitly approved destructive Arena rollback: back up Arena schema/data with `pg_dump --schema=arena`, inventory any dependencies outside Arena, and stop Arena endpoints/traffic. A DBA must review the `DROP SCHEMA arena CASCADE` dependency graph first: `CASCADE` can remove external objects that later depend on Arena. Only then run the reviewed `supabase/rollback/20261030100000_arena_schema.rollback.sql` using a securely configured operator connection:

```bash
psql --dbname="$DB_URL" -X --set=ON_ERROR_STOP=1 \
  --file="$ARENA_DEPLOY_DIR/supabase/rollback/20261030100000_arena_schema.rollback.sql"
```

This is a production write requiring separate approval. It removes Arena data/objects but does not revert migration history, Edge deployments, origin secrets, or exposed-schema settings. Do not run history repair: an eventual reinstallation needs a separately reviewed forward migration. Any function deletion or cleanup of the new schema exposure/origin secret requires explicit approval and must preserve unrelated website configuration. A full project restore is an emergency website-wide operation requiring its own owner approval.

## Outstanding approval boundaries

No approval is requested or implied by this runbook. Still requiring explicit authorization: production migration execution; appending exposed API schema; setting the Arena origin secret; each Edge deployment; frontend publication; rehearsal writes against a production project; any role/permission repair, rollback, function deletion, or full-project restore. Exporting personal-data backups and restore testing must also be authorized and handled by the operator. Read-only diagnostics/local preparation are already authorized; they do not authorize any of those writes.
