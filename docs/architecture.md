# Architecture

## Competition V3 — local correction (2026-10-31)

V3 extends existing competition_stages.active_index with current-item timestamps, no duplicate challenge tables. A shared demo selector and canonical Stage1 join-code alias sit above the unchanged two internal rooms. State and atomic submission RPCs enforce the same current item for every role.

Current operation/security/deployment gate: [V3 guide](competition-v3.md). V2 sections below describe the prior release.

## Competition V2 — current local candidate (2026-10-30)

V2 adds a competition domain above the existing rooms, two independent stage rooms and stable competition_team_id. The deployed baseline migration is unchanged. See the V2 guide for lock ordering, invoker-only RPC dispatch, capabilities and immutable snapshots.

[Competition V2 guide](competition-v2.md) contains the authoritative architecture, scoring, deployment gates, rollback and rehearsal instructions. Historical audit entries below describe earlier candidates.

The Vite entrypoint composes `App` and feature views. Pure game rules live in `src/lib/gameLogic.ts`; React components consume deterministic traces from `runRobot`. Accessibility content is structured data with safe preview metadata. Supabase is an optional adapter: empty credentials always select standalone mode.

Robot levels are validated at module load with BFS over `(x, y, direction)`. Turns cost one command. Procedural maps use a seeded PRNG and a bounded 80-attempt loop.
