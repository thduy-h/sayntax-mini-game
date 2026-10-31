# Shared Supabase architecture

> 2026-11-01 V5 update: New V5 competitions use canonical attempt-ledger optimization fees, versioned shared demo state and separate finalization/publication; legacy competitions retain their original rules. See [Competition V5 release review](competition-v5-release.md) for current rules, verification, screenshots and deployment gates.

## Competition V2 — current local candidate (2026-10-30)

V2 is additive to the already-deployed Arena schema. Six competition tables and two foreign-key columns stay in arena. No main website objects or project settings change. Legacy room gameplay stays supported behind wrappers.

[Competition V2 guide](competition-v2.md) contains the authoritative architecture, scoring, deployment gates, rollback and rehearsal instructions. Historical audit entries below describe earlier candidates.

Game Arena uses one Supabase project but a separate PostgreSQL schema:

- `arena.rooms`: hashed MC token, six-character code, lifecycle and expiry.
- `arena.teams`: hashed team join token, maximum eight enforced under a database transaction lock.
- `arena.rounds`: immutable game/config/content version after start.
- `arena.submissions`: one unique submission per round/team/item and idempotency key.
- `arena.submission_attempts`: replay-safe attempt records for successful and failed programs.
- `arena.team_scores`: verified aggregate score per team and round.
- `arena.rate_limits`: bounded request counters used by the Edge Functions.

The browser receives only the project URL, anon key, and short-lived room/team tokens. It calls Edge Functions; it does not write Arena tables. The service role is available only in Edge Function runtime secrets. For this workshop, the frontend intentionally polls `arena-get-state` every five seconds. Polls never overlap, stop on unmount, report offline/error states, and recover the complete canonical state after reconnecting.

Room lifecycle changes and round creation run through service-role-only PostgreSQL functions so the room and round state change in one transaction. These RPCs are not executable by `PUBLIC`, `anon`, or `authenticated`.

The current implementation keeps standalone mode when `VITE_SUPABASE_*` is absent. In configured mode, the leaderboard no longer falls back to seeded fake teams.
