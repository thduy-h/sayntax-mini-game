# Stage deadline / finalization timeout hotfix — 2026-11-01

A live V5 Accessibility stage was closed at index 3 of 6 after its shared ten-minute deadline. Advancing correctly failed, but MC controls did not explain expiry. Finalization logs separately showed PostgreSQL statement timeout inside result aggregation; the Edge fallback misleadingly blamed Competition V2 readiness.

Production maintenance refreshed planner statistics only for Arena competition teams/results, room teams, submissions and attempts. No gameplay rows, deadlines, results, policies or settings were changed. This is a planner maintenance mitigation, not proof that every source of future contention is eliminated.

A disposable synthetic production competition then completed all six questions via real HTTPS and finalized with 600 XP. Finalization plus a subsequent state request took 0.60 seconds. No participant competition was finalized by the maintenance script.

MC UI now disables close/advance after the server-reported shared deadline and explicitly directs MC to finalize. Finalization remains available after expiry, preserving existing rules (unanswered items earn zero; no deadline extension). SQL timeout, lock timeout and deadlock errors now return `competition_busy`; generic failures no longer assert a missing V2 backend. Existing transaction/score logic is unchanged.

Verification: 35 Vitest; 24 existing Deno tests plus one new timeout-classification regression; eight Playwright MC regression cases across desktop/mobile; production build; Deno checks for manage/start/get-state; git diff --check. No new migration. Redeployed manage-room, start-round and get-state with JWT verification enabled.
