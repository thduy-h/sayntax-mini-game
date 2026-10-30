# Competition V3 focused audit and plan

Local patch only: no remote connection, push, deployment, settings or production SQL.

Audit: Participant uses its own `useState(index)` and challenge navigation; presentation uses persisted `active_index`. `process_submission` accepts any frozen-set item. MC `challenge` action allows arbitrary indices. Join QR selects one of two room codes and frontend restores separate stage sessions. No shared demo state exists. Preserve V1/V2 SQL unchanged.

Plan: additive V3 migration replaces affected invoker RPC bodies, adds item timestamps and a demonstration stage selector. Lock order remains competition → stage → room → round → team. MC controls use competition UPDATE; submissions SHARE locks then team UPDATE. Require current active item and open deadline after team lock. CAS index protects duplicate/concurrent progression. All teams attempted or item deadline permits close/advance; stage timeout permits finalization. No speed score. Defaults: 150 seconds/question, 300 seconds/map, bounded by stage deadline.

Use Stage1 room code as canonical persistent join code, retaining both internal rooms. A single restoration issues one random credential hash to both room sessions; recovery still needs hashed recovery capability, never a name. State authorizes the room session but projects current stage team ID/submissions. No new competition identity after stage1 begins. Old stage links remain compatible aliases but MC advertises only the canonical link. Browser keeps session credentials; downloaded recovery card restores across devices.

Demo data is separate from official bank/maps, local repeatable and zero-write; MC selects demo before each official stage. Spectator receives read-only demo plus selected public challenge and aggregate counts only. Participant receives only active public challenge (MC retains full configuration preview). No keys/solver data before finalization. Presentation capability remains competition-wide.

Test existing suites unchanged in scope; extend mock to V3 behavior and progression. Add actual PostgreSQL concurrency/security/deadline/inactive-item/identity/rollback assertions after V2 regressions. Capture and inspect ten screens at 1440×900 and390×844 under artifacts/ui-review. Run TypeScript, Vitest, Deno, build, full Playwright and dependency audit. Document exact evidence and deployment gate.
