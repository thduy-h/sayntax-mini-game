# Scoring

## Competition V3 — local correction (2026-10-31)

V3 keeps100/50/0 Accessibility, highest verified Robot completion per map and equal50/50 normalization. Only the server-active open item can be submitted. Skipped/unanswered items count zero. Default150s/question and300s/map; overall10/15-minute limits remain. Demo makes no official submission and awards zero competition XP.

Current operation/security/deployment gate: [V3 guide](competition-v3.md). V2 sections below describe the prior release.

## Competition V2 — current local candidate (2026-10-30)

Official V2 score = Accessibility XP / 8 + Robot points / 6. Only finalized snapshots count. Robot counts executed commands to first goal: failed0; success max(60,100−8×extra), best score only. Merit tie-breaks precede deterministic sudden death; no speed bonus.

[Competition V2 guide](competition-v2.md) contains the authoritative architecture, scoring, deployment gates, rollback and rehearsal instructions. Historical audit entries below describe earlier candidates.

Accessibility: option points are canonical (100 best, partial credit, 0 ineffective); a standard four-question round is capped at 400 XP and has no speed bonus.

Robot completion: `max(100, 320 - 18 * max(0, commandCount - par))`. Failed collision attempts earn 15 local XP for feedback only; production workshop submissions must award no completion XP for failed executions. A team should receive at most one authoritative score per level; retries may improve the stored best score.
