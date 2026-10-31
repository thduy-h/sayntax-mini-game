# BEFORE/AFTER across participant devices — 2026-11-01

Status: implemented and verified locally; NOT deployed. No production queries or writes were made for this patch.

The original `useA11ySync` uses localStorage/BroadcastChannel. It reaches tabs in one browser profile, not other phones. Production CompetitionPortal now reads `a11yViewMode` and `a11yViewScope` from the authenticated state endpoint. MC writes `set_a11y_view` through arena-manage-room; participant/presentation receive it on existing five-second polling. No extra polling or privileged participant controls. Standalone keeps its local preview hook.

The participant Demo was also missing the controlled viewMode prop. It now receives the same backend state as official questions and presentation. Saved global browser mode cannot override server state. Offline clients retain their last received state and recover through the existing reconnect polling.

## Database and authorization

New migration: `20261101020000_arena_a11y_display_sync.sql`.
SHA-256: `37ff1dfc2603b88357255ab42bdc75e9459c4c299191a4d00e87996108febacb`.

Adds two display columns to arena.competitions and a scope helper. Retains the existing control/state implementations under `*_without_display` names and wraps their original entrypoints. This preserves the actual production 4-question/3-level behavior, state allowlists, authentication, scoring and process_submission implementation. No existing applied migration was edited.

MC display writes acquire the existing competition UPDATE lock through competition_admin, revalidate MC expiry/revocation, validate the expected demo/item scope and only allow official AFTER once the item is closed or stage finalized. Demo AFTER is allowed. Starting a stage, showing a demo or advancing resets BEFORE. A delayed previous-item write fails even when it races with progression. The state wrapper invokes existing role authorization first and holds its competition SHARE lock while projecting the two safe display fields, including the spectator early-return path. Participant and presentation capabilities cannot write.

All new functions use SECURITY INVOKER and search_path=pg_catalog. Browser roles have no schema access or EXECUTE, including internal retained functions. Service role remains Edge-only. Public/Auth objects, CORS, JWT and scores are unchanged.

## Local evidence

- TypeScript and production build passed; Vitest 32/32.
- PostgreSQL 17.11 disposable cluster: existing V1/V2/V3 transaction, concurrency, grants, rollback and website-isolation suites passed. New display suite: four eight-team runs; all team/spectator reads agree; no premature AFTER; invalid/revoked capabilities denied; both real-connection display/advance race orders; scope reset; rollback/reapply; no outstanding lock waits; canonical totals preserved.
- Reviewed production-compatible Edge bundle: 4/4 Deno tests; both root and reviewed arena-manage-room entrypoints pass deno check.
- Full root Edge suite: 16 passed, 4 failed. Baseline with pre-patch competition-api.ts independently gives 15 passed, the same 4 failures. These are existing V2 test fixtures versus root V4 6/4 content expectations (invalid_scenario_ids, preset/map mismatch, item_not_in_round), not caused or resolved by this display patch. Do not deploy root V4 content as a workaround.
- Playwright cross-device tests use three independent BrowserContexts with separate storage and mocked Edge transport. Cover MC -> team/spectator changes both directions, reconnect/reload, active closed item and next-item reset. They do not prove deployed network behavior. Final Playwright run: 32/32 desktop/mobile tests passed, including cross-device, join, MC and standalone regressions.
- No new screenshots or extended visual audit, per the user's request.

## Reviewed deployment sequence — requires approval

1. Take a fresh reviewed Arena backup and retain current Edge/frontend release. Older backups are restore evidence, not a current recovery point.
2. Prepared reviewed bundle: `.local-audit/a11y-display-hotfix/functions`; manifest beside it. It is copied from the previously deployed V3 hotfix bundle. Exactly one file differs: `_shared/competition-api.ts`, forwarding viewMode/viewScope through p_config. No content/defaults/scoring changes.
3. Generate isolated checkout (local-only):

   ```sh
   python3 scripts/prepare-arena-deployment.py --a11y-display --function-source .local-audit/a11y-display-hotfix/functions
   ```

   Prepared checkout for this run: `/tmp/sayntax-arena-deploy-ehhz19sa`. Contains the actual five deployed migration versions (V3 version `20261031191004`) plus only this new patch. Original website SQL is copied unchanged. Root V4, QR and state-projection drafts are excluded. No migration-history repair.
4. From that checkout, with DB_URL already securely provided in the shell, inspect history and dry-run before any apply:

   ```sh
   supabase migration list --db-url "$DB_URL"
   supabase db push --db-url "$DB_URL" --dry-run
   ```

   Stop unless only `20261101020000_arena_a11y_display_sync.sql` is pending. Neither command was run against production in this task.
5. Only after explicit approval, apply this one reviewed migration, run `supabase/verification-a11y-display.sql` read-only (all checks true), then deploy only reviewed arena-manage-room with verify_jwt=true. Do not deploy root shared content or change schema exposure/CORS/secrets/JWT. arena-get-state already forwards the database RPC result, so it does not need redeployment for these additive fields.
6. Release the frontend only after the backend is ready. On old backend, the frontend defaults to BEFORE and gives an explicit backend-upgrade message when MC tries changing mode; it never silently pretends cross-device sync succeeded.
7. Smoke-test using MC browser and a separate phone/browser profile: demo BEFORE -> AFTER -> BEFORE within one poll; refresh phone; start official item; AFTER unavailable before closure; close then switch AFTER; advance and check BEFORE on all clients. Spectator controls stay disabled, participant scores unaffected.

Production apply/deploy/publish remain approval-gated. No production GO is claimed from mocks/local PostgreSQL.

## Rollback

Restore previous frontend and arena-manage-room release, then apply the reviewed `supabase/rollback/20261101020000_arena_a11y_display_sync.rollback.sql` during a controlled window if required. It restores the exact pre-patch RPC bodies/ACLs by renaming them back and drops only the new display columns/helper. It does not remove competition identities, submissions or scores. Tested locally, including reapplication. If any intervening migration changed these functions, stop and review dependencies before rollback; do not overwrite newer definitions blindly.
