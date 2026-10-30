# Gameplay

## Competition V3 — local correction (2026-10-31)

V3 synchronizes the current question/map across MC, all teams and presentation. Teams cannot select challenges. MC opens a separate zero-score demo, starts the stage, then closes/advances each item. One persistent join QR covers both stages. Practice remains unchanged.

Current operation/security/deployment gate: [V3 guide](competition-v3.md). V2 sections below describe the prior release.

## Competition V2 — current local candidate (2026-10-30)

Competition uses four frozen questions (100/50/0; 10 minutes), then three frozen Robot maps (0 or 60–100; 15 minutes) at separate workshop times. Practice retains its original rules. Review/optimal solutions open only after finalization.

[Competition V2 guide](competition-v2.md) contains the authoritative architecture, scoring, deployment gates, rollback and rehearsal instructions. Historical audit entries below describe earlier candidates.

## Accessibility Unlock

The bank contains A01–A12. The workshop preset selects four unique questions using a deterministic room seed; free play can use the full bank. Each question has three options, one worth 100 XP, partial credit, and no negative score. Answers lock after submission. The Before/After simulator is a short explanation aid, not a second game.

## Robot Commands

Nine curated levels are grouped into Beginner, Explorer, and Master. Commands are Move Forward, Turn Left, and Turn Right; programs are capped at 24 commands. Run, pause, resume, and step through the deterministic execution trace. On completion, Ghost Path reports the player's command count, BFS shortest solution, and difference.
