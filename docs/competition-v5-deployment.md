# Competition V5 — approved production backend release

User approval: “duyệt”, 2026-11-01 Asia/Ho_Chi_Minh. Approved source: `2a59b22` plus BEFORE/AFTER `cb90499`. Production frontend is released through the existing Git integration on `main`; review-branch automatic deployments stay disabled. No main SAYNTAX website, CORS, environment, schema exposure, secret or JWT configuration changes.

## Backup, dry-run and applied migrations

Fresh private logical snapshot:13 Arena tables,286 rows,22 function definitions, migration history; source backups of all7 deployed Edge Functions. Stored under `.local-audit/v5-approved-deployment/` with restricted permissions and Git exclusion. Restored all286 rows into disposable PostgreSQL17, applied both approved migrations, verified original values and score invariants; reversing both migrations restored original values exactly.

Ran the complete two-migration SQL in a transaction on production, then ROLLBACK. Confirmed both the V5 helper and new display column absent afterwards. This was an actual transactional production dry-run, not a CLI `supabase db push --dry-run` (no direct DB credentials available). Applied the same reviewed SQL through the Supabase migration API afterwards.

| Source filename | Actual recorded production version | SHA-256 |
| --- | --- | --- |
| `20261101020000_arena_a11y_display_sync.sql` | `20261031201122` | `37ff1dfc2603b88357255ab42bdc75e9459c4c299191a4d00e87996108febacb` |
| `20261101030000_arena_competition_v5.sql` | `20261031201129` | `8c3d7813674b6236e3603320019a3f1805193bc0c6301b5e1ef3c2ee18ddacd7` |

The Supabase API assigns timestamps. The isolated checkout generator now maps these filenames to the actual recorded versions, as already done for V3. Do not reapply the source filenames as pending migrations, modify original applied SQL, repair history, or push the older V4/QR/projection drafts. Regenerated checkout `/tmp/sayntax-arena-deploy-rp9gdwel` matches all7 recorded versions and original checksums.

## Edge release and postflight

All7 functions ACTIVE, JWT verification true: arena-create-room v4, arena-join-room v4, arena-manage-room v5, arena-start-round v4, arena-submit-accessibility v4, arena-submit-robot v4, arena-get-state v4. Downloaded deployed source and compared every returned file against the approved source: all match.

Postflight:4 V5 columns present;0 unsafe invoker/search-path definitions;0 browser-executable Arena functions;0 missing RLS tables; anon/authenticated schema USAGE false;0 aggregate mismatches. All9 pre-existing competitions remain legacy. All192 original non-rate-limit rows retain their original values; rate-limit counters are intentionally mutable. Fingerprints for public relations/security, policies, functions and public/Auth triggers are unchanged.

## Real hosted rehearsal

Created exactly one clearly labelled disposable synthetic competition, `[DEPLOY SMOKE V5] Synthetic eight teams`. It remains as a finalized test record; no existing competition scores were changed. Its credentials are in the private local evidence directory only; no MC/team credentials were printed or committed.

185 real HTTPS calls against deployed Edge Functions, with the production Origin, gateway anon JWT and separate MC/team/spectator capabilities:

- New competition is V5 with6 questions/4 levels;8 teams register once. Same persistent join code restores all8 competition identities in Stage2; no duplicate teams.
- All6 Accessibility questions receive8 concurrent team submissions; MC progression reports8/8. Inactive item rejected. BEFORE/AFTER reaches team and spectator capabilities; stage start resets BEFORE; presentation capability cannot act as MC.
- Shared Robot Demo queue/run/pause/step/reset agree through independent authenticated reads; stale version rejected.
- All4 Robot levels complete. Six simultaneous retries of one failed optimization charge exactly once (base84→79); the second optimization improves base to100 and final90; further retry rejected. Other levels aggregate to Robot390, Accessibility600, final98.75.
- Final results stay private at RESULTS_READY; public state has no leaderboard or winner. All5 manual ceremony transitions pass. Ranking publishes8 teams; winner identifier only appears at winner phase; winner score98.75; public explanation has one team and no execution history. Active official presentation does not expose optimal commands/paths.

Evidence: `hosted-smoke.log`, `hosted-smoke-summary.json`, `postflight.json`, `rehearsal.log` in the private local directory. This verifies real hosted API/database behavior, not projector scan quality or physical phone latency. Local Playwright68/68 plus final V5 rerun2/2 and16 inspected screenshots are documented in [the implementation review](competition-v5-release.md).

## Frontend release and operating guidance

Backend release succeeded before publishing `main`. Frontend publication uses the existing repository/Vercel integration because the saved Vercel CLI login has expired; production environment variables are preserved. Live asset and routing checks are recorded separately in local postflight evidence after the Git push.

Create a **new competition** for V5. Existing competitions deliberately retain their previous frozen content/scoring; they are not upgraded to6/4 retroactively. Keep using the same join QR across both sessions, with recovery credentials when changing devices. MC finalizes Stage2 privately and explicitly operates the ceremony at the end of the workshop.

Backend deployment: GO for verified hosted API/database behavior. Workshop readiness: CONDITIONAL GO pending real projector QR scan and MC/participant phones rehearsal. No arbitrary winner or private result publication was introduced. Once V5 records exist, the rollback SQL intentionally refuses; preserve canonical history and use a reviewed forward fix or backup restore rather than deleting official records.
