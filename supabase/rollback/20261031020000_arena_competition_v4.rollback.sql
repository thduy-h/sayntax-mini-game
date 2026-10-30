-- Rollback for 20261031020000_arena_competition_v4.sql
-- Restores V3 competition quantities (4q/3lvl) and old leaderboard formula.
-- Run only if V4 migration needs to be reverted BEFORE production deployment.

begin;

-- Restore competition_results constraints (old: 400/300 ceiling)
alter table arena.competition_results
  drop constraint if exists competition_results_raw_score_check;
alter table arena.competition_results
  add constraint competition_results_raw_score_check
    check(raw_score >= 0 and raw_score <= case when stage_no = 1 then 400 else 300 end);

alter table arena.competition_results
  drop constraint if exists competition_results_perfect_count_check;
alter table arena.competition_results
  add constraint competition_results_perfect_count_check
    check(perfect_count between 0 and 4);

-- Restore old leaderboard formula (V3: a/8.0, b/6.0, (3a+4b)/24.0)
create or replace function arena.competition_leaderboard(p_id uuid) returns jsonb
language sql security invoker set search_path = pg_catalog as $$
  with totals as (
    select t.id, t.name, t.created_at,
      coalesce(max(r.raw_score) filter(where r.stage_no = 1), 0) a,
      coalesce(max(r.raw_score) filter(where r.stage_no = 2), 0) b,
      coalesce(max(r.perfect_count) filter(where r.stage_no = 1), 0) ap,
      coalesce(max(r.perfect_count) filter(where r.stage_no = 2), 0) bp
    from arena.competition_teams t
    left join arena.competition_results r
      on r.competition_team_id = t.id and r.competition_id = t.competition_id
    where t.competition_id = p_id
    group by t.id
  ), ranked as (
    select *,
      dense_rank() over(
        order by (3*a + 4*b) desc, ap desc, bp desc,
          array(
            select coalesce(
              (select ta.score from arena.competition_tie_answers ta
               where ta.competition_id = p_id
                 and ta.competition_team_id = totals.id and ta.attempt = g),
              0)
            from generate_series(
              1,
              (select tie_index - case when tie_active then 1 else 0 end
               from arena.competitions where id = p_id)
            ) g
          ) desc
      ) rank
    from totals
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'teamId', id, 'name', name,
        'accessibility', a, 'robot', b,
        'accessibility50', a / 8.0, 'robot50', b / 6.0,
        'final100', (3*a + 4*b) / 24.0,
        'perfectAccessibility', ap, 'optimalRobot', bp, 'rank', rank
      ) order by rank, created_at, id
    ), '[]'
  ) from ranked;
$$;

-- NOTE: competition_control and competition_state functions with old guards
-- would need to be restored from the V3 migration text.
-- The V3 migration (20261031010000_arena_competition_v3.sql) contains the
-- authoritative V3 versions. Re-apply those CREATE OR REPLACE statements
-- from that file to complete the rollback of the control and state functions.

revoke all on function arena.competition_leaderboard(uuid) from public, anon, authenticated;
grant execute on function arena.competition_leaderboard(uuid) to service_role;

commit;
