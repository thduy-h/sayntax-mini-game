# Robot-only V5 stage shortcut

This PR lets an authorized MC skip Accessibility **before it begins** and run
Robot Commands as the only scored stage. Existing stage submissions and scores
are never deleted or fabricated.

## How to use
1. Create/open a V5 competition and register teams first.
2. MC confirms **Bỏ qua Game 1 → Chuẩn bị Robot**. New registration closes.
3. Existing teams retain their competition IDs, tokens and recovery credentials.
4. MC optionally shows Robot Demo, or starts Game 2 directly.
5. The 15-minute timer starts only when the MC starts Game 2.
6. Robot scoring retains all V5 attempt/penalty rules but contributes
   `robotRaw / 400 * 100` to the final leaderboard.
7. Winner remains unpublished until the existing ceremony controls reveal it.

**Database representation:** `competition_mode=robot_only` and
`status=STAGE_1_FINALIZED` allow existing V5 transitions; Stage 1's real DB
row stays `pending`, without fake results. The state projection reports
Stage 1 as `skipped`.

**Production:** Apply new migration after confirming PostgreSQL health;
there are no Edge Function source edits. Do not deploy automatically.

## Verification before merging
- [ ] Isolated PG16/17 migration and rollback tests
- [ ] MC-only authorization; expired/invalid/duplicate skip is rejected
- [ ] No stage1 round/result rows after skipping
- [ ] Full competition remains 50/50 and Robot-only becomes 100% Robot
- [ ] Existing registered teams rejoin Stage 2 with stored/recovery credential
- [ ] Existing QR and Presentation keep working
- [ ] Stage 2 Demo optional; stage deadline starts only on MC start
- [ ] Eight-team browser rehearsal, tournament results, delayed winner reveal
- [ ] No connection or query timeout regressions (prior PG 57014 incident)

The rollback intentionally refuses if Robot-only rooms exist.
