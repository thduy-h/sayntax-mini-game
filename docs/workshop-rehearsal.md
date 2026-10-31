# Eight-team workshop rehearsal

> 2026-11-01 V5 update: Rehearse V5 with eight synthetic teams and separate MC/projector/phone contexts: shared demo, paid optimization, recovery, private results, ties and manual ceremony reveal. See [Competition V5 release review](competition-v5-release.md) for current rules, verification, screenshots and deployment gates.

## Competition V3 — local correction (2026-10-31)

V3 rehearsal: scan the same QR from8 devices, save cards, reject ninth registration; show Accessibility demo and confirm0 attempts/XP; start question1; all devices/presentation must agree. Forge future/past item submissions and confirm denial. MC waits for8/8 or deadline, closes/advances through4 questions, finalizes. After workshop break use the SAME QR, restore on fresh devices and verify same8 team IDs. Show Robot demo (zero XP), start15-minute stage, advance3 maps, retry safely, finalize/publish one winner. Verify presentation has no submit controls or answer/solver fields, offline recovery and main-site smoke. Hosted rehearsal remains pending; use only approved test rooms.

Current operation/security/deployment gate: [V3 guide](competition-v3.md). V2 sections below describe the prior release.

## Competition V2 — current local candidate (2026-10-30)

Current V2 rehearsal requires eight real team sessions across two independent rooms plus MC and spectator. Mocked browser transport and local PostgreSQL evidence do not replace a hosted rehearsal. The full checklist and hard failure criteria are in the V2 guide.

[Competition V2 guide](competition-v2.md) contains the authoritative architecture, scoring, deployment gates, rollback and rehearsal instructions. Historical audit entries below describe earlier candidates.

Run on an authorized Supabase staging environment containing the website baseline and reviewed Arena migration. No staging target is configured in this checkout. Do not create a new project or use the production website project for rehearsal writes without explicit approval. Mocked tests are useful but cannot satisfy this gate.

Record browser versions, desktop/mobile sizes, build SHA, SQL manifest hashes, project ref, start/end timestamps, and sanitized observed results. Use one MC plus eight independent browser sessions; use a ninth team context for rejection checks. Never record tokens, API keys or personal user data.

Session Pooler validation: operator reports only the Arena migration pending and a successful `--db-url` dry-run. The previous managed login-role failure is not a blocker for this connection method. The revised atomic migration passed real local PostgreSQL 16/17 tests; repeat the direct-URL dry-run for its new hash before deployment. The previous dry-run covers the old candidate only. See `production-deployment-checkpoint.md`.

## Checklist

1. Confirm successful CLI dry-run: exactly the Arena migration pending; backup/restore evidence recorded. Post-migration queries show seven Arena tables with RLS, zero browser schema/table/RPC access, required service-role privileges. Website fingerprints match baseline.
2. Confirm all seven deployed functions have `verify_jwt=true`. Enabled legacy anon JWT → gateway acceptance. Missing/invalid bearer and publishable-key-only invocation → 401. Valid bearer with bad/missing team or MC credentials → denial; team credentials cannot manage a room. CORS preflight succeeds only for the exact approved browser origin; test a different origin.
3. MC creates room. Eight teams join **before** room lock. Concurrent joins must never produce a ninth row. Ninth context receives `room_team_limit_reached`; room code alone grants no MC permission. Lock room; all further joins fail.
4. Select four questions and three curated levels. Start Accessibility round, then attempt duplicate/concurrent start and config changes: only one active round, identical frozen question order/content version on all clients. Standard maximum = 400 XP; no speed bonus.
5. Submit one best, one partial, and one zero-credit answer; check canonical totals. Submit different questions concurrently for the same team and compare `team_scores.score` with the canonical sum; both must equal the combined XP (corrected candidate must retain the locally verified 200/400 totals). Replay submissions concurrently with the same and different idempotency keys: no extra XP and the first answer stays locked. Client-supplied XP/map/par must have no effect.
6. End Accessibility normally. Start Robot using the selected three levels. Failed/colliding programs earn zero completion XP; verified successes use the canonical formula, at most 320 XP/level (960 maximum for three). Concurrent duplicate retries cannot add XP; improved verified retries retain the best score per level. Achievements do not add workshop XP.
7. Observe all nine clients for 60 seconds: about 108 scheduled state polls/minute combined, plus initial/manual/action refreshes. No overlapping state request per client, no growing timers after navigation, no 429/5xx in normal play. Leaderboards converge within two polling intervals (10 seconds) on a healthy network; record latency/error metrics rather than assuming capacity from the interval.
8. Disconnect a team, show offline state, reconnect and reload: correct identity/room/round/config/verified leaderboard restores without fake teams. Repeat MC reload. Verify an old poll cannot overwrite a newer room action. Confirm current score persists even when the local game's answer UI restarts.
9. On isolated test rooms verify expired room/token rejection, team revocation, MC/team separation and round end during in-flight submission. End round: no further scored submission is accepted. Simulate a lost response/network interruption and retry the identical key (database fault hooks run only in the disposable local test suite, never install them in production): score must be committed exactly once or an explicit retriable error returned, never false success. End workshop: credentials are revoked as intended. A network retry must never claim a score was awarded if the server did not commit it.
10. Run main website sign-in, profile/onboarding, lesson progress, program save/run and admin smoke checks. Compare policy/grant/function/trigger fingerprints and verify existing website behavior is unchanged. Measure actual 10-minute Accessibility (09:45–09:55: 2/5/3 minutes) and 15-minute Robot (10:35–10:50: 3/8/4 minutes) flows; these are facilitation slots, not forced timeouts.

## GO criteria

All ten checks pass on the actual deployed staging stack, with recorded evidence. No unauthorized database/RPC access, no duplicate XP, no ninth team, no stale frozen config, no unhandled normal-load errors, no website regressions, and a verified recovery plan. Any missing real-stack evidence, failed security/concurrency check, unresolved scoring race or failed direct-URL dry-run or unavailable restore point is **NO-GO for production**. Production rollout still requires explicit owner authorization after staging GO. The current state remains **NO-GO for production workshop**.

## Atomic correction evidence and rehearsal criteria

Disposable PostgreSQL 16.15 and 17.11 passed 10 repeats of parallel different-item/duplicate/Robot/eight-team cases, both forced end/revoke orders and fault rollback tests. This does not complete this deployed rehearsal. Record server canonical sums and leaderboard totals after every test; both must match. Retry payload conflicts must reject, another team's identical idempotency key must remain independent, and a delayed retry response may carry its historical commit total: the next state poll must restore the current total without leaderboard regression.

A normal production rehearsal must not mutate expiry timestamps or install error triggers. Use an authorized isolated test environment for expiry and intentional database fault scenarios. Do not shorten shared project token/JWT settings to simulate expiry. Any production test-room writes need explicit approval.
