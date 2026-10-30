# Competition V2: audit and implementation plan

## Audit (local code only, 2026-10-30)

Git root is the requested Game Arena directory. Its tracked history includes website files; the existing Arena implementation is largely untracked. Preserve that working tree; do not switch checkout, stage unrelated files, push, or use production connections.

The deployed baseline migration has SHA-256 `3722ba18fa2583c59640e5165f69cf841f773c8881e30e1f15bf904bb221d65d`. Seven Edge entrypoints exist. Custom-schema access is backend-only; room/team token checks and atomic submissions already exist. Existing polling interval is five seconds. Vercel has a SPA rewrite. No local Supabase config is present. No hosted settings or deployments were inspected for this task.

Missing: competitions, stable cross-room identity, recovery, server deadlines, frozen stage totals, final ranking/tie resolution, spectator capabilities. Practice question data includes correctness and Robot maps include computed optimal commands; competition must use a separate public content projection and server-only answer mapping. Legacy gameplay is not suitable as the competition participant interface.

## Plan

1. Add an additive migration after the deployed baseline, with rollback and verification. Reuse rooms/rounds/team_scores; add competitions, competition teams, two stage records, finalized results, sudden-death state, and presentation capabilities. All mutations use SECURITY INVOKER RPCs with fixed search paths, service_role-only execution and no browser table grants.
2. Lock competition (SHARE for independent submissions; UPDATE for lifecycle/recovery), room, round, team in that order. Add a competition branch to process_submission; retain the legacy implementation under a backend-only name. Deadline validation happens after locks. Finalization snapshots canonical verified submissions atomically.
3. Keep credentials hashed server-side. Stage 1 registration issues a high-entropy competition recovery credential. Recovery rotates the room token, supports another device, and stage 2 only admits existing competition teams. MC can reissue recovery without obtaining a team session. Expires after 48 hours.
4. Preserve all seven endpoints and add competition action dispatch; use get-state for separate MC/team/presentation projections. Presentation has an independent revocable token. JWT verification stays enabled. No production deployment in this task.
5. Use a versioned competition question variant bank (100/50/0, plausible distractors), BFS-scored curated Robot levels (100..60; failed 0; count executed until first goal). Return no answer metadata before stage finalization and no optimal paths. Equal stage weighting, integer ranking keys and deterministic merit tie-breaks; an explicit deterministic sudden-death must produce a unique winner before publication.
6. Add competition control center, read-only content/presentation, participant registration/recovery and a server-time-derived visual deadline. Keep practice/workshop UI working. Competition sessions survive browser closure through an explicit recoverable credential, never name matching.
7. Test with disposable PostgreSQL (including original website migrations and fingerprints), actual parallel connections, existing regression suites, Deno scoring/security tests, Vitest and multi-context Playwright. Report hosted verification as unexecuted. Prepare local-only deploy/rollback instructions and stop at approval gate.
