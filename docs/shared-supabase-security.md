# Shared Supabase security — atomic submission release

## Competition V3 — local correction (2026-10-31)

V3 retains SECURITY INVOKER, pg_catalog search paths, service-only RPC access, zero browser schema/table/RPC grants and JWT verification. Current item/open state/deadlines are rechecked after locks; MC progression has a compare-and-set index. Recovery rotates/revokes both room sessions; public code-resolution never creates teams. Spectators receive prompt/map and aggregate counts only.

Current operation/security/deployment gate: [V3 guide](competition-v3.md). V2 sections below describe the prior release.

## Competition V2 — current local candidate (2026-10-30)

V2 separates MC, room-team, recovery and presentation capabilities; hashes only in PostgreSQL. All RPCs are invoker-only, pg_catalog search_path, backend-only grants; no browser schema/table/RPC privileges. Competition SHARE locks coordinate with lifecycle/recovery UPDATE locks. JWT verification remains true. Presentation projection excludes private data and keys.

[Competition V2 guide](competition-v2.md) contains the authoritative architecture, scoring, deployment gates, rollback and rehearsal instructions. Historical audit entries below describe earlier candidates.

No production deployment or security-setting change is authorized. See [checkpoint](production-deployment-checkpoint.md) for evidence and gates.

Room codes identify rooms and grant no MC/team authority. High-entropy tokens are stored as SHA-256 hashes; MC and team permissions remain separate. Exact-origin CORS fails closed. Database-backed rate limits cover create/join/manage/poll/start/submission. Rate-limit writes intentionally survive a denied submission; score/attempt writes do not.

## Trusted transaction and lock order

Both submission Edge Functions calculate canonical XP, then invoke only `arena.process_submission` for persistence. No HTTP insert into attempts/submissions or follow-up score RPC remains. The database revalidates exactly the config and version used to score. Client XP, maps and par values are ignored. Accessibility scores come from canonical server option IDs; Robot commands are limited to 24 and replayed against the frozen trusted map.

| Operation | Lock order |
| --- | --- |
| Submit | room SHARE → round SHARE → team UPDATE → attempt → canonical submission → aggregate |
| End round | room UPDATE → active round UPDATE → room state update |
| Revoke team | room UPDATE → target team UPDATE |
| End workshop | room UPDATE → active round UPDATE → team revocations → room revocation |
| Start round | room UPDATE → new round / room state |
| Join | room advisory transaction guard → room UPDATE → team INSERT (lobby only) |

Submission locks never upgrade room/round SHARE to UPDATE. Shared parent locks permit different teams to submit concurrently; the team row serializes that team's writes. Administrative actions wait for earlier submissions and block later ones. All future administrative/token mutators must follow this protocol, rather than validating in Edge then changing records outside it. No code locks team then room. Multi-team end revokes only after exclusive room lock, when no submissions hold teams.

Room/team membership, room/round active status, token hash/revocation/wall-clock expiry, item membership and exact content snapshot are checked under locks. Expiry after a lock wait cannot use a stale transaction-start timestamp. MC start/manage also recheck MC credentials under room lock. Valid results committed before end/revoke remain; if administration obtains its lock first, submissions reject without attempts/scores.

## Credit and idempotency

- Accessibility: one canonical record per round/team/item; first submitted answer locks credit, including 0 XP. Later answers cannot improve it.
- Robot: failed attempts have no completion record/credit. Best verified completion replaces that item's score; attempts never accumulate item credit.
- Attempts have unique `(round_id, team_id, idempotency_key)` and bind item/payload. Same authorized active retry returns the committed response with duplicate flag; changed payload rejects. Reuse by another team cannot consume its key.
- Stored responses include the authoritative **total at that transaction's commit**, not a newly recomputed total on every retry. Poll state for the latest leaderboard. End/revoke still rejects retries.
- Attempt, canonical record, delta aggregate and stored response commit or roll back together. No production fault-injection switch exists.
- Aggregate trigger inserts a zero row if needed, then atomically adds new-minus-old verified contribution. It does not overwrite with a pre-wait SUM. Canonical totals must equal leaderboard totals; verification SQL checks this read-only.

## Database privilege boundary

All seven Arena tables enable RLS with no browser allow policies. PUBLIC/anon/authenticated receive no schema usage, table/sequence privileges or function EXECUTE. Effective permissions are asserted in real local PostgreSQL, including denied browser RPC calls.

All Arena routines are SECURITY INVOKER with `search_path=pg_catalog`; Arena table/function references are schema-qualified. No definer escalation is necessary because the trusted service role already has BYPASSRLS. Service grants are restricted to schema USAGE, SELECT/INSERT/UPDATE on Arena tables and EXECUTE on five RPCs: consume_rate_limit, process_submission, start_round, apply_room_action, expire_room_if_needed. No sequence, DELETE, TRUNCATE, REFERENCES or TRIGGER grants. Trigger functions are not granted as callable service RPCs.

The service-role credential stays in Edge runtime. A compromised service credential still has project-wide power: schema separation is not infrastructure isolation. These RPCs accept verified scoring arguments from the trusted Edge, not from browser clients; possession of service credentials bypasses that trust boundary. Never expose service credentials or grant browser roles RPC execution.

The migration changes only Arena objects/grants. Local tests apply the two original website migrations with a minimal synthetic Auth fixture and verify public/Auth object/policy/grant/function/trigger fingerprints stay identical. This is not a real Auth/Storage or main-site browser smoke test.

## Gateway, runtime and remaining evidence

Keep `verify_jwt=true` for all seven endpoints and use the enabled legacy anon JWT in the Arena frontend. Publishable keys alone are not signed JWTs for this gateway; independent team/MC headers do not replace the gateway JWT. No participant Auth accounts are required. Do not rotate website keys or disable gateway verification. SDK header tests are synthetic; deployed gateway acceptance remains unverified.

Edge SDK uses pinned npm:@supabase/supabase-js@2.99.0; runtime tests no longer depend on the esm.sh CDN. Exact approved HTTPS origin, exposed `arena` API schema with restricted grants, platform-provided runtime secrets, real CORS, quota/load behavior, production backup recovery, deployed multi-client rehearsal and website smoke checks remain external gates. No production GO follows from local SQL or mocked HTTP tests.
