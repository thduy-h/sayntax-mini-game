# Competition V3 — synchronized MC flow (local patch)

V2 let teams choose an independent local question/level index, while presentation used a different server index. The submission RPC checked membership of the frozen set, not the active item. The MC selector was an arbitrary presentation selector; QR codes selected separate stage rooms. V3 corrects these exact defects without changing practice scoring or deployed SQL files.

## Workshop operation

1. Open homepage → **Tổ chức cuộc thi hai giai đoạn**. Create competition, select four questions and three maps before their respective stages start. All teams receive identical content.
2. Display **Một QR tham gia xuyên suốt cuộc thi**. This is `/join/:code`, with no credential or stage in the URL. Register eight teams once; save recovery cards privately.
3. Create a read-only presentation link. Its separate hashed capability stays valid across both stages until expiry (maximum8h) or explicit rotation/revocation. No participant or MC privileges.
4. After workshop session1, select **Hiển thị Demo phiên1**. The contrast-button tutorial is separate from all official question IDs, repeatable, zero XP and has no submission endpoint. Participants try three solutions and see why contrast matters; spectators see a read-only explanation.
5. **Bắt đầu phiên1** starts the common10-minute deadline and question1. A participant sees only the current item and cannot navigate. First answer locks; feedback remains neutral until stage finalization.
6. MC sees question number, stage/item time, submitted/pending counts and per-team submission statuses. Default item allowance150s; close/advance when all teams attempted or the item time expires. Closing leaves the prompt visible but rejects submissions. Advance opens only the next item, never skips backwards/forwards. No-submit means zero. The stage timer never resets.
7. Close question4 then **Chốt phiên1**. The server may also finalize at the overall deadline if the MC has not reached the last item; remaining items count zero. Show provisional ranking, never announce the final winner.
8. Workshop session2: the same QR restores the same competition identity. Existing browser session can continue without re-registration; another browser/device enters the recovery credential. No display-name authentication. New teams cannot register after stage1 starts.
9. Select **Hiển thị Demo phiên2**. A separate4×4 map teaches movement, rotation, walls, running/stepping, collision, reset and comparison with a verified five-command tutorial solution. It never writes attempts/scores. Spectator/MC demo is read-only; participants can repeat it.
10. **Bắt đầu phiên2** starts15 minutes. Three common maps, default300s each, same MC-controlled close/advance policy. Retries retain only each map's best verified completion score. No Ghost Path or optimal commands in active responses.
11. Close map3 and finalize stage2 (or finalize on overall timeout). Publish only after merit tie-break/sudden death gives exactly one winner. Accessibility/400×50 + Robot/300×50, no speed bonus.

Early advancement banks the unused stage time, but each next item still has at most its default allowance; both clocks are server-authoritative. There is no MC endpoint to extend a running deadline. These fixed defaults are the current configuration policy.

## State, locks and permissions

New migration: `supabase/migrations/20261031010000_arena_competition_v3.sql`. Existing V1/V2 migrations are byte-identical to the deployed reviewed sources. No new tables, schemas, endpoints, roles, policies or browser grants. Changes are Arena-only:

- `competitions.demo_stage`: pending-stage demo selector, cleared at official start.
- `competition_stages.item_started_at`, `item_deadline_at`, `item_finalized_at`; existing `active_index` remains canonical. Current item ID derives from the immutable configuration.
- Replace `competition_control`, `process_submission`, `competition_state`, `join_competition`, `freeze_competition_stage`. All remain SECURITY INVOKER with `search_path=pg_catalog` and explicit schema references. Existing service-only EXECUTE ACLs are retained and browser EXECUTE is explicitly revoked again.

Lock order: competition → stage → room → round → room-team → attempt/canonical score/aggregate. Submission uses SHARE locks through the round, then one room-team UPDATE lock, retaining parallel progress across teams. MC progression/finalization and recovery take competition UPDATE first. A stale request checks current item/open state/deadline after the team lock. An already closed, previous, future or expired item is rejected before inserting any attempt. Same-item retries remain atomic/idempotent; a retry after closure is rejected and earns no additional credit.

`advance_challenge`/`close_challenge` require the expected active index (compare-and-set). Competing requests for the same index cannot advance twice. Arbitrary V2 `challenge` actions are rejected. Finalized stages reject any mutation, including changing the active index.

The Stage1 room code is the persistent public alias. Both internal rooms and distinct room-team IDs remain. One join/restore transaction rotates the random session capability hash for both pre-associated room teams; only its hash is stored. State authenticates the supplied room session, then projects the currently relevant room-team ID and private submissions. The frontend uses this authoritative ID when submitting. Recovery approval revokes both room sessions under the same competition lock. Lost cards still require in-person MC approval of a reissue request. Team credentials are never in join URLs.

Participant responses contain only the active prompt/map; future configs are omitted until finalized. MC retains full read-only preview. Spectator responses contain only explicit public prompt/map, timestamps and aggregate submission counts, never roster/private submissions, answer correctness or solver data. An independent code-resolution action returns public competition ID/mode only, performs no team creation and is rate-limited; legacy workshop links still work.

## UI review

Capture command (mocked Edge transport, synthetic credentials only):

```bash
PLAYWRIGHT_EXECUTABLE_PATH=/etc/profiles/per-user/thduy-h/bin/microsoft-edge npm run test:e2e -- tests/e2e/competition.spec.ts
```

Screens are local artifacts, ignored by Git. Viewports: desktop1440×900; mobile390×844. Each full-page screenshot uses that viewport width; scrollable dashboards naturally exceed the viewport height. The QR capture is a panel crop at the same viewport. See [visual review](competition-v3-ui-review.md) for exact paths and inspected findings.

## Deployment gate

No production connection, SQL, migration, settings, secrets, function deployment, frontend publishing or push was performed for V3.

Before any future approved release: obtain a full backup/restore plan; ensure no live competition is in progress; review this additive migration and rollback; run current migration history/dry-run against the intended project under separate authorization. Apply only the reviewed V3 migration after V1/V2 (never modify/repair history). Existing active rows receive their previous stage deadline as item deadline, but operational rollout should use a quiet maintenance window rather than changing a live contest.

All seven existing functions need a coordinated redeployment because they share `competition-api.ts` and/or `handler.ts`: `arena-create-room`, `arena-join-room`, `arena-manage-room`, `arena-start-round`, `arena-submit-accessibility`, `arena-submit-robot`, `arena-get-state`. No eighth endpoint. Keep `verify_jwt=true`, existing exact CORS and existing frontend public-key requirements. No new exposed schema, CORS, JWT, environment variable or secret setting is required.

Then release the paired frontend; V3 UI cannot be released alone against V2 RPC behavior. Run `supabase/verification-competition-v3.sql` read-only, real hosted8-team rehearsal, network/reconnect/deadline checks and main-website smoke tests. Local PostgreSQL and mocked browsers do not prove hosted JWT/CORS/Edge/PostgREST integration.

Rollback SQL is guarded by `arena.confirm_v3_rollback='reviewed-backup'` and rejects active stages. It restores the exact previous five function definitions, removes only new demo/timing fields, and retains scores, identities and rooms. Roll back the frontend/Edge source together. Review before execution; it is not an automatic recovery action. A downgrade restores V2 participant-selection semantics and therefore should not be used to run a synchronized competition.
