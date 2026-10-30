# Shared Supabase audit

## Findings

## Live read-only verification — 2026-10-30

The connected Supabase project URL is `https://hiuetzywfwudajaorqkx.supabase.co`, matching the project ref recorded by both the main SAYNTAX workspace metadata and this audit. The MCP inspection was read-only; no SQL write, migration, setting change, or function deployment was performed.

Live database facts:

- Schemas include `public`, `auth`, `storage`, `realtime`, and platform schemas. `arena` does not exist.
- Public tables are the 13 website tables already documented; all reported RLS enabled. There are zero `public.arena_*` tables.
- The live migration history contains `20260309184500 initial_schema` and `20260412000000 lesson_v2_progress`. The Arena migration is not applied.
- `list_edge_functions` returns an empty list. There are no deployed function-name conflicts.
- No publication rows were visible through `pg_publication_tables`; the current Arena polling design does not depend on Realtime replication.
- `pgcrypto` is installed in `extensions`, and the live search path includes `extensions`, so the migration's `gen_random_uuid()` defaults are compatible.
- Existing public website policies and grants remain confined to public objects. The proposed migration only creates and grants the new `arena` objects, then revokes browser roles there.

The live security advisors report pre-existing website findings: executable `SECURITY DEFINER` functions in `public`, mutable search paths on two public functions, disabled leaked-password protection, RLS initialization-plan warnings, and several unindexed foreign keys. These are outside Arena scope and were not changed. They should be tracked by the main website owner before production hardening.

The API exposed-schema list and project Auth/JWT dashboard settings are not exposed by the available read-only MCP calls. They remain manual staging checks. The project reports enabled legacy anon and publishable keys (gateway use has not been exercised); no key value is recorded in this report.

The main SAYNTAX repository is `/home/thduy-h/Documents/TD/SAYNTAX`. It uses `@supabase/ssr` and `@supabase/supabase-js` in `apps/web`, with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and an optional server-only `SUPABASE_SERVICE_ROLE_KEY`. The local Supabase metadata identifies project ref `hiuetzywfwudajaorqkx`; this is code/workspace evidence, not proof that the credentials or production deployment are available.

The main site owns public tables including `users`, `student_profiles`, `accessibility_settings`, courses, lessons, programs, progress, voice logs, and role models. RLS is enabled on those tables with self/admin policies. No Edge Functions were present in the main repository; server-side Next.js routes use the SSR client and service-role helper only for privileged admin operations. No Realtime publication configuration was found in tracked migrations. Storage and live dashboard settings were not verifiable locally.

The Game Arena previously created `public.arena_*` tables and used a public RPC/read-only subscription. That naming and public-schema approach is unsuitable for the shared project. The new integration uses a dedicated `arena` schema and trusted Edge Functions. Existing public migrations are retained for historical compatibility but must not be applied to the main project as the integration path.

## Compatibility

No existing object name conflicts with `arena`. The dedicated schema avoids changing main tables, Auth, public RLS policies, or existing Next.js routes. A shared Supabase project still has project-wide blast radius through extensions, Realtime settings, API exposure, quotas, and service-role access; staging verification is required before production migration.

The original website SQL files were located in the main repository and copied byte-for-byte into an isolated checkout with the reviewed Arena migration. They also already exist in the Game Arena repo; the previous report claiming they were missing was incorrect. SHA-256 provenance is recorded in `shared-supabase-migration.md`. The version set matches live history with exactly one additional local Arena version.

CLI 2.122.0 link succeeded, but migration-list and dry-run both failed during managed login-role initialization (`cli_login_postgres` permissions). No successful CLI pending-plan verification exists. The rejected platform provisioning attempt was not retried with elevated privileges; no migration/history repair was performed. Read-only MCP reconfirmed the two original live versions and absent Arena schema.

The earlier API-key guidance was also corrected: a publishable key is not a JWT. This plan uses an enabled legacy anon JWT with `verify_jwt=true`; changing to publishable-key-only authorization requires a separately reviewed architecture. The installed SDK's actual header behavior was verified with intercepted synthetic requests, not production calls.
