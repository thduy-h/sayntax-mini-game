# SAYNTAX pilot operations

Server failures emit one-line JSON to stderr (Vercel function logs):
`progress_write_failure`, `program_save_failure`, `program_run_failure`,
`voice_log_failure`, `auth_failure`, `onboarding_failure`.
Only timestamp, event, level, fixed phase and numeric HTTP status are serialized.
No request body, exception message/stack, profile text, transcript, audio or
credentials are included. `apps/web/lib/operations/logger.ts` is the sink to
connect to external monitoring later. Access to platform logs should be restricted
to operators; configure retention there. No new analytics collection is added.

CI runs on pushes and PRs using Node 22 and npm 11, without deployment or secrets.
Builds must remain possible without Supabase credentials. Vercel deployment is unchanged.

Manual pilot checks:
- With a test account, verify login/callback, onboarding and existing progress writes.
- In staging, deny a write and confirm the matching event and no sensitive values in logs.
- Confirm response headers and microphone access in a top-level page on Chrome/Edge.
- Confirm public demo still works without Supabase configuration.
- Run ASR upload tests as documented in asr-server/README.md.

Headers deny framing and camera/geolocation, allow same-origin microphone, and
set nosniff and strict-origin-when-cross-origin. TODO: trial a report-only CSP
against Blockly, Supabase, local ASR connections and Vercel before enforcement.
No CSP is imposed in this change.

300 registered users is a product KPI, not verified concurrency capacity. Before
opening a shared ASR endpoint, complete its production checklist and measure load.
