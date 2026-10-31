# Robot run-only — approved production release

User approval: “rồi duyệt”, 2026-11-01 Asia/Ho_Chi_Minh. Reviewed implementation: `8336c0c` on `robot-v5-execution-review`. This approval supersedes the local-only status recorded at implementation review time. Release uses the existing mini-game repository and production Vercel Git integration; no main SAYNTAX website, environment, CORS, schema exposure, secrets or JWT setting changes.

## Backup, rehearsal and migration

Fresh private backup:13 Arena tables,626 rows,38 SQL function definitions and all7 deployed Edge sources, under `.local-audit/robot-run-deployment/`, excluded from Git. Restored the complete snapshot into disposable PostgreSQL17, applied the run-only migration, verified every original value and aggregate, ran rollback/reapply and repeated exact comparisons. All626 restored rows were preserved; browser privileges remained denied and functions remained invokers with fixed search paths.

An actual production BEGIN/ROLLBACK dry-run also succeeded. Confirmed the old function definition returned after rollback and the140 original attempts remained unchanged, then applied the exact approved migration through the Supabase migration API.

| Source migration | Actual recorded production version | SHA-256 |
| --- | --- | --- |
| `20261101050000_arena_robot_run_only.sql` | `20261031232058` | `ed34c9ce3388d337cf4b96e6d922346b0deb8136cc2233e85eb05898ade439e6` |

The deployment helper now maps this source filename to the actual API-assigned production version. Do not reapply the source filename, repair history or apply the older superseded V4/QR/projection draft SQL. The preceding color-vision migration was already deployed and was not reapplied.

## Edge Functions and isolation

All7 functions ACTIVE with JWT verification true: `arena-create-room` v5, `arena-join-room` v5, `arena-manage-room` v7, `arena-start-round` v5, `arena-get-state` v5, `arena-submit-accessibility` v5, `arena-submit-robot` v5. Downloaded each deployed function and compared every returned runtime dependency with the reviewed local source: all match.

Deployment order installed submission/finalized-review support before enabling new private-map creation/configuration. No new endpoint or browser score authority was introduced. Postflight:0 unsafe functions,0 browser-executable Arena RPCs,0 missing-RLS Arena tables,0 score aggregate mismatches; anon/authenticated schema usage false. Fingerprints for public relations/security, policies, functions and public/Auth triggers are unchanged. All488 original non-rate-limit rows remain identical after the hosted rehearsal; mutable rate-limit counters are excluded from this comparison.

## Real hosted API rehearsal

Exactly one initial synthetic eight-team competition, `[DEPLOY SMOKE RUN ONLY] Synthetic eight teams`, exercised235 real HTTPS calls through the deployed JWT gateway and existing production CORS policy:

- Four server-frozen progressive maps use `run-only-v1`, differ from the public Free-play layouts and are withheld from team/presentation responses before release.
- Eight teams complete six Accessibility questions with concurrent submissions per question; the same persistent join code and recovery credentials restore all eight identities into Stage2.
- MC BEFORE/AFTER and color simulation agree across separately authenticated team/spectator reads. Spectator capability cannot change MC state. Live unscored Robot Demo queue/run/pause/step/reset follows the server state; a team capability cannot control it.
- Every team sees the same active frozen Robot map. A valid collision commits one failed official execution with0 score. Forged preview/action/XP/optimal fields do not create a free execution path. Spectator and inactive-item requests return no execution trace.
- Eight concurrent retries of one failed optimization charge only once. First success84 → failed optimization79 → improved best100 with two accumulated fees90. A third optimization is rejected. Paid execution after an optimal success remains accounted for and does not expose an optimality-status oracle. Active responses omit optimal count/status and hidden routes.
- Four levels aggregate to390 Robot points for the leading team; Accessibility600 yields98.75/100. All per-team explanations reconcile to6+4 items. Stage2 finalization keeps public results hidden, rejects later attempts and preserves scores. All five explicit ceremony phases pass, with one resolved winner and no public execution history.

Private evidence: `hosted-smoke.log`, `hosted-smoke-summary.json`, `postflight-before-smoke.json`, `rehearse.log` and synthetic credentials in the local evidence directory. Credentials and private snapshots are never committed or printed.

## Frontend release and operation

The frontend is published by fast-forwarding the verified review branch onto mini-game `main` and pushing through the existing Vercel integration. The unrelated uncommitted `docs/mc-control-fix.md` changes are preserved and excluded. Review-branch automatic deployments remain disabled. Post-push production assets, nested-route refresh and real desktop/mobile browser checks are recorded under `.local-audit/robot-run-deployment/`.

Create a **new competition** for private frozen maps. Existing started competitions retain their original maps and scores; maps already disclosed through the previous public practice bank cannot be made secret retroactively. Reuse the same join QR throughout both stages. Only RUN PROGRAM executes official Robot submissions; manual controls remain in the dedicated unscored Demo. MC publishes the award ceremony explicitly at workshop end.

Local review:35 Vitest,24 Deno,72 Playwright tests and52 PostgreSQL scenario groups passed, plus all7 Deno checks, TypeScript/build/lint, dependency audit and diff whitespace checks. Backend release: GO for the actual hosted behaviors tested above. Workshop operation still requires a physical projector/phone QR rehearsal; physical iOS Safari was unavailable. The guarded SQL rollback intentionally refuses after new-policy attempts exist: preserve canonical data and use a reviewed forward fix.
