-- V4: Update competition quantities, timers, leaderboard formula, and result constraints.
-- Supersedes old V3 assumptions (4q/3lvl/150s/300s/old denominators).
-- V3 applied migration remains unchanged per production-safety rules.
-- New values: 6 accessibility questions, 4 robot levels,
--   Stage 1: 10 min / 90s per question. Stage 2: 15 min / 195s per level.
-- Rollback: supabase/rollback/20261031020000_arena_competition_v4.rollback.sql

begin;

-- ───────────────────────────────────────────────────────────────────
-- 1. Fix competition_results score ceiling
--    Old: stage 1 ≤ 400, stage 2 ≤ 300
--    New: stage 1 ≤ 600 (6 × 100), stage 2 ≤ 400 (4 × 100)
-- ───────────────────────────────────────────────────────────────────
alter table arena.competition_results
  drop constraint if exists competition_results_raw_score_check;
alter table arena.competition_results
  add constraint competition_results_raw_score_check
    check(raw_score >= 0 and raw_score <= case when stage_no = 1 then 600 else 400 end);

-- Also fix perfect_count ceiling (was 4 for both, now 6 for stage 1)
alter table arena.competition_results
  drop constraint if exists competition_results_perfect_count_check;
alter table arena.competition_results
  add constraint competition_results_perfect_count_check
    check(perfect_count between 0 and case when stage_no = 1 then 6 else 4 end);

-- ───────────────────────────────────────────────────────────────────
-- 2. Fix competition_leaderboard: correct denominators
--    Old: a/8.0 (a/400*50), b/6.0 (b/300*50), (3a+4b)/24.0
--    New: a/12.0 (a/600*50), b/8.0 (b/400*50), a/12.0+b/8.0
--    Tie-break: perfectAccessibility out of 6, optimalRobot out of 4
-- ───────────────────────────────────────────────────────────────────
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
      -- V4 normalization: A/600*50 + B/400*50
      round((a / 12.0 + b / 8.0)::numeric, 4) final100,
      dense_rank() over(
        order by
          (a / 12.0 + b / 8.0) desc,
          ap desc,  -- tie-break 1: perfect accessibility answers (out of 6)
          bp desc,  -- tie-break 2: optimal robot levels (out of 4)
          -- tie-break 3: sudden death scores (MC-controlled)
          array(
            select coalesce(
              (select ta.score from arena.competition_tie_answers ta
               where ta.competition_id = p_id
                 and ta.competition_team_id = totals.id
                 and ta.attempt = g),
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
        'teamId',             id,
        'name',               name,
        'accessibility',      a,
        'robot',              b,
        'accessibility50',    round((a / 12.0)::numeric, 4),
        'robot50',            round((b / 8.0)::numeric, 4),
        'final100',           final100,
        'perfectAccessibility', ap,
        'optimalRobot',       bp,
        'rank',               rank
      )
      order by rank, created_at, id
    ),
    '[]'
  )
  from ranked;
$$;

-- ───────────────────────────────────────────────────────────────────
-- 3. Fix competition_control: advance guards, item timers, finalize guard
--    Old guards: active_index >= (stage=1 ? 3 : 2)   [last index for 4q/3lvl]
--    New guards: active_index >= (stage=1 ? 5 : 3)   [last index for 6q/4lvl]
--    Old timers: 150s/300s per item
--    New timers: 90s/195s per item
--    Old finalize: active_index != 3:2
--    New finalize: active_index != 5:3
-- ───────────────────────────────────────────────────────────────────
create or replace function arena.competition_control(
  p_id uuid, p_hash text, p_action text,
  p_stage integer default null, p_config jsonb default null,
  p_index integer default null, p_request uuid default null,
  p_presentation_hash text default null
) returns jsonb
language plpgsql security invoker set search_path = pg_catalog as $$
declare
  c arena.competitions;
  s arena.competition_stages;
  rd uuid;
  rec arena.competition_recovery_requests;
  n integer;
  best integer;
begin
  c := arena.competition_admin(p_id, p_hash);
  if c.status = 'FINALIZED' and p_action not in ('presentation_rotate', 'presentation_revoke', 'challenge') then
    raise exception 'competition_finalized';
  end if;

  if p_action = 'show_demo' then
    select * into s from arena.competition_stages
      where competition_id = c.id and stage_no = p_stage for update;
    if not found
      or s.status <> 'pending'
      or (p_stage = 1 and c.status <> 'NOT_STARTED')
      or (p_stage = 2 and c.status <> 'STAGE_1_FINALIZED')
    then raise exception 'invalid_transition'; end if;
    update arena.competitions set demo_stage = p_stage where id = c.id;

  elsif p_action in ('close_challenge', 'advance_challenge') then
    select * into s from arena.competition_stages
      where competition_id = c.id and stage_no = p_stage for update;
    if not found or s.status <> 'active' or p_index is null
      or s.active_index <> p_index or s.deadline_at <= clock_timestamp()
    then raise exception 'invalid_transition'; end if;
    if s.item_finalized_at is null
      and clock_timestamp() < s.item_deadline_at
      and exists(
        select 1 from arena.teams t
        where t.room_id = s.room_id
          and not exists(
            select 1 from arena.submission_attempts a
            where a.round_id = s.round_id and a.team_id = t.id
              and a.item_id = (
                case when s.stage_no = 1 then s.config -> 'scenarioIds'
                     else s.config -> 'levelIds' end
                ->> s.active_index
              )
          )
      )
    then raise exception 'teams_pending'; end if;

    if p_action = 'close_challenge' then
      if s.item_finalized_at is not null then raise exception 'invalid_transition'; end if;
      update arena.competition_stages
        set item_finalized_at = clock_timestamp()
        where competition_id = c.id and stage_no = p_stage;
    else
      -- V4: last valid index = 5 for stage 1 (6 questions), 3 for stage 2 (4 levels)
      if s.active_index >= (case when p_stage = 1 then 5 else 3 end) then
        raise exception 'invalid_challenge';
      end if;
      update arena.competition_stages
        set active_index = active_index + 1,
            item_started_at = clock_timestamp(),
            -- V4 timers: 90s per question (Stage 1), 195s per level (Stage 2)
            item_deadline_at = least(
              deadline_at,
              clock_timestamp() + make_interval(secs => case when p_stage = 1 then 90 else 195 end)
            ),
            item_finalized_at = null
        where competition_id = c.id and stage_no = p_stage;
    end if;

  elsif p_action = 'configure' then
    select * into s from arena.competition_stages
      where competition_id = c.id and stage_no = p_stage for update;
    if not found or s.status <> 'pending' then raise exception 'configuration_frozen'; end if;
    update arena.competition_stages set config = p_config
      where competition_id = c.id and stage_no = p_stage;

  elsif p_action = 'start_stage' then
    if (p_stage = 1 and c.status <> 'NOT_STARTED')
      or (p_stage = 2 and c.status <> 'STAGE_1_FINALIZED')
      or p_stage not in (1, 2) or p_stage is null
    then raise exception 'invalid_transition'; end if;
    if not exists(select 1 from arena.competition_teams where competition_id = c.id) then
      raise exception 'no_teams';
    end if;
    select * into s from arena.competition_stages
      where competition_id = c.id and stage_no = p_stage for update;
    if s.status <> 'pending' then raise exception 'invalid_transition'; end if;
    update arena.rooms set status = 'locked' where id = s.room_id;
    insert into arena.rounds(room_id, game, status, config, content_version, started_at)
      values(
        s.room_id,
        case when p_stage = 1 then 'accessibility' else 'robot' end,
        'running', s.config, 'competition-v2-1', clock_timestamp()
      ) returning id into rd;
    update arena.competition_stages
      set status = 'active',
          round_id = rd,
          started_at = clock_timestamp(),
          -- V4 stage durations: 600s (Stage 1 = 10 min), 900s (Stage 2 = 15 min)
          deadline_at = clock_timestamp() + make_interval(secs =>
            case when p_stage = 1 then 600 else 900 end),
          active_index = 0,
          item_started_at = clock_timestamp(),
          -- V4 per-item timers: 90s (questions), 195s (levels)
          item_deadline_at = clock_timestamp() + make_interval(secs =>
            case when p_stage = 1 then 90 else 195 end),
          item_finalized_at = null
      where competition_id = c.id and stage_no = p_stage;
    update arena.rooms
      set status = 'running', config = jsonb_build_object('roundId', rd), version = version + 1
      where id = s.room_id;
    update arena.competitions
      set demo_stage = null,
          status = case when p_stage = 1 then 'STAGE_1_ACTIVE' else 'STAGE_2_ACTIVE' end
      where id = c.id;

  elsif p_action = 'finalize_stage' then
    if (p_stage = 1 and c.status <> 'STAGE_1_ACTIVE')
      or (p_stage = 2 and c.status <> 'STAGE_2_ACTIVE')
      or p_stage not in (1, 2) or p_stage is null
    then raise exception 'invalid_transition'; end if;
    select * into s from arena.competition_stages
      where competition_id = c.id and stage_no = p_stage for update;
    -- V4: last index = 5 (stage 1, 6q) / 3 (stage 2, 4lvl)
    if clock_timestamp() < s.deadline_at
      and (s.active_index <> (case when p_stage = 1 then 5 else 3 end)
           or s.item_finalized_at is null)
    then raise exception 'challenges_pending'; end if;
    perform 1 from arena.rooms where id = s.room_id for update;
    perform 1 from arena.rounds where id = s.round_id for update;
    insert into arena.competition_results(competition_id, stage_no, competition_team_id, raw_score, perfect_count)
      select c.id, p_stage, ct.id,
        coalesce(sum(sub.verified_score) filter(where sub.verified), 0),
        count(*) filter(where sub.verified and sub.verified_score = 100)
      from arena.competition_teams ct
      left join arena.teams t on t.competition_team_id = ct.id and t.room_id = s.room_id
      left join arena.submissions sub on sub.team_id = t.id and sub.round_id = s.round_id
      where ct.competition_id = c.id
      group by ct.id;
    update arena.rounds set status = 'completed', ended_at = clock_timestamp() where id = s.round_id;
    update arena.rooms set status = 'locked', version = version + 1 where id = s.room_id;
    update arena.competition_stages
      set status = 'finalized',
          finalized_at = clock_timestamp(),
          item_finalized_at = coalesce(item_finalized_at, clock_timestamp())
      where competition_id = c.id and stage_no = p_stage;
    update arena.competitions
      set status = case when p_stage = 1 then 'STAGE_1_FINALIZED' else 'STAGE_2_FINALIZED' end
      where id = c.id;
    if p_stage = 2 then
      update arena.competitions
        set tie_candidates = array(
          select (e ->> 'teamId')::uuid
          from jsonb_array_elements(arena.competition_leaderboard(c.id)) e
          where (e ->> 'rank')::integer = 1
        )
        where id = c.id;
    end if;

  elsif p_action = 'publish' then
    if c.status <> 'STAGE_2_FINALIZED' or c.tie_active or cardinality(c.tie_candidates) <> 1 then
      raise exception 'tie_unresolved';
    end if;
    update arena.competitions set status = 'FINALIZED', winner_team_id = tie_candidates[1]
      where id = c.id;

  elsif p_action = 'start_tiebreak' then
    if c.status <> 'STAGE_2_FINALIZED' or cardinality(c.tie_candidates) < 2 or c.tie_active then
      raise exception 'invalid_transition';
    end if;
    update arena.competitions
      set tie_active = true, tie_index = tie_index + 1,
          tie_deadline_at = clock_timestamp() + interval '3 minutes'
      where id = c.id;

  elsif p_action = 'finalize_tiebreak' then
    if not c.tie_active then raise exception 'invalid_transition'; end if;
    select count(*), coalesce(max(score), 0)
      into n, best
      from arena.competition_tie_answers
      where competition_id = c.id and attempt = c.tie_index
        and competition_team_id = any(c.tie_candidates);
    if n < cardinality(c.tie_candidates) and clock_timestamp() < c.tie_deadline_at then
      raise exception 'tie_answers_pending';
    end if;
    update arena.competitions
      set tie_candidates = array(
        select id from unnest(c.tie_candidates) id
        where coalesce(
          (select score from arena.competition_tie_answers
           where competition_id = c.id and attempt = c.tie_index
             and competition_team_id = id),
          0) = best
      ), tie_active = false
      where id = c.id;

  elsif p_action = 'challenge' then
    raise exception 'mc_progression_required';

  elsif p_action = 'presentation_rotate' then
    if p_presentation_hash is null or length(p_presentation_hash) <> 64 then
      raise exception 'invalid_token';
    end if;
    update arena.competitions
      set presentation_hash = p_presentation_hash,
          presentation_expires_at = least(expires_at, clock_timestamp() + interval '8 hours'),
          presentation_revoked_at = null
      where id = c.id;

  elsif p_action = 'presentation_revoke' then
    update arena.competitions set presentation_revoked_at = clock_timestamp()
      where id = c.id;

  elsif p_action = 'approve_recovery' then
    select * into rec from arena.competition_recovery_requests
      where id = p_request and competition_id = c.id for update;
    if not found or rec.approved or rec.expires_at <= clock_timestamp() then
      raise exception 'invalid_recovery_request';
    end if;
    update arena.competition_teams set recovery_hash = rec.recovery_hash, recovery_revoked_at = null
      where id = rec.competition_team_id;
    update arena.teams set token_revoked_at = clock_timestamp()
      where competition_team_id = rec.competition_team_id;
    update arena.competition_recovery_requests set approved = true where id = rec.id;

  else raise exception 'invalid_action';
  end if;

  return jsonb_build_object('ok', true);
end $$;

-- ───────────────────────────────────────────────────────────────────
-- 4. Fix competition_state: totalItems = 6 for stage 1, 4 for stage 2
-- ───────────────────────────────────────────────────────────────────
create or replace function arena.competition_state(
  p_id uuid, p_role text, p_hash text, p_team uuid default null
) returns jsonb
language plpgsql security invoker set search_path = pg_catalog as $$
declare
  c arena.competitions;
  t arena.teams;
  result jsonb;
  stages jsonb;
  own jsonb;
  teams jsonb;
begin
  select * into c from arena.competitions where id = p_id for share;
  if not found or c.expires_at <= clock_timestamp() or p_hash is null then
    raise exception 'forbidden';
  end if;

  if p_role = 'mc' then
    if c.mc_token_hash <> p_hash or c.mc_revoked_at is not null then
      raise exception 'forbidden';
    end if;
  elsif p_role = 'presentation' then
    if c.presentation_hash is null or c.presentation_hash <> p_hash
      or c.presentation_revoked_at is not null
      or c.presentation_expires_at <= clock_timestamp()
    then raise exception 'forbidden'; end if;
  elsif p_role = 'team' then
    select tm.* into t from arena.teams tm
      join arena.rooms r on r.id = tm.room_id
      where tm.id = p_team and r.competition_id = c.id
      for share of tm;
    if not found or t.join_token_hash <> p_hash
      or t.token_revoked_at is not null or t.token_expires_at <= clock_timestamp()
    then raise exception 'forbidden'; end if;
  else raise exception 'forbidden';
  end if;

  -- A room token authorizes one stable competition identity.
  if p_role = 'team' then
    select tm.* into t from arena.teams tm
      join arena.competition_stages s on s.room_id = tm.room_id
      where tm.competition_team_id = t.competition_team_id
        and s.competition_id = c.id
        and s.stage_no = case
          when c.status in ('STAGE_1_FINALIZED', 'STAGE_2_ACTIVE', 'STAGE_2_FINALIZED', 'FINALIZED')
          then 2 else 1 end;
  end if;

  -- Configs contain public prompts/maps only, never answer keys or BFS sequences.
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'stageNo', s.stage_no, 'status', s.status,
      'roundId', s.round_id, 'startedAt', s.started_at,
      'deadlineAt', s.deadline_at, 'activeIndex', s.active_index,
      'roomCode', case when p_role <> 'presentation' then r.code else null end,
      'config', s.config, 'contentVersion', s.content_version
    ) order by s.stage_no
  ), '[]') into stages
  from arena.competition_stages s
  join arena.rooms r on r.id = s.room_id
  where s.competition_id = c.id;

  result := jsonb_build_object(
    'mode', 'competition', 'role', p_role,
    'serverNow', clock_timestamp(),
    'competition', jsonb_build_object(
      'id', c.id, 'name', c.name, 'status', c.status,
      'expiresAt', c.expires_at, 'winnerTeamId', c.winner_team_id
    ),
    'stages', stages
  );

  -- ── Presentation path (minimal, no config library, no roster) ──
  if p_role = 'presentation' then
    result := result || jsonb_build_object('stages', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'stageNo', s.stage_no, 'status', s.status,
          'startedAt', s.started_at, 'deadlineAt', s.deadline_at,
          'activeIndex', s.active_index,
          -- V4 totalItems for presentation
          'totalItems', case when s.stage_no = 1 then 6 else 4 end,
          'challenge', case when s.status = 'active'
            then case when s.stage_no = 1 then s.config -> 'questions' -> s.active_index
                      else s.config -> 'maps' -> s.active_index end
            else null end
        ) order by s.stage_no
      ), '[]')
      from arena.competition_stages s
      where s.competition_id = c.id
    ));
    return result;
  end if;

  -- ── MC / Team shared enrichment ──
  result := result || jsonb_build_object(
    'leaderboard', arena.competition_leaderboard(c.id),
    'tie', jsonb_build_object(
      'active', c.tie_active, 'attempt', c.tie_index,
      'deadlineAt', c.tie_deadline_at, 'candidates', c.tie_candidates
    )
  );

  if p_role = 'mc' then
    select coalesce(jsonb_agg(
      jsonb_build_object('id', id, 'name', name)
      order by created_at, id
    ), '[]') into teams
    from arena.competition_teams where competition_id = c.id;
    result := result || jsonb_build_object(
      'teams', teams,
      'recoveryRequests', (
        select coalesce(jsonb_agg(
          jsonb_build_object('id', id, 'teamId', competition_team_id, 'expiresAt', expires_at)
        ), '[]')
        from arena.competition_recovery_requests
        where competition_id = c.id and not approved and expires_at > clock_timestamp()
      ),
      'presentationEnabled',
        c.presentation_hash is not null
        and c.presentation_revoked_at is null
        and c.presentation_expires_at > clock_timestamp()
    );
  else
    -- Team: own submission state; score only visible for Robot stage and finalized Accessibility
    select jsonb_build_object(
      'teamId', t.id,
      'competitionTeamId', t.competition_team_id,
      'name', t.name,
      'submissions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'itemId', sub.item_id,
          'answerId', sub.payload ->> 'answerId',
          'score', case when s.stage_no = 2 or s.status = 'finalized'
                        then sub.verified_score else null end
        ))
        from arena.submissions sub
        join arena.competition_stages s on s.round_id = sub.round_id
        where sub.team_id = t.id and sub.verified
      ), '[]'),
      'tieSubmitted', exists(
        select 1 from arena.competition_tie_answers
        where competition_id = c.id
          and attempt = c.tie_index
          and competition_team_id = t.competition_team_id
      )
    ) into own;
    result := result || jsonb_build_object('own', own);
  end if;

  -- ── Per-stage enrichment (challenge, progress, team status) ──
  select coalesce(jsonb_agg(
    (e - 'config')
    || jsonb_build_object(
      -- V4: totalItems = 6 for stage 1, 4 for stage 2
      'totalItems', case when s.stage_no = 1 then 6 else 4 end,
      'activeItemId',
        case when s.stage_no = 1 then s.config -> 'scenarioIds'
             else s.config -> 'levelIds' end ->> s.active_index,
      'itemStartedAt', s.item_started_at,
      'itemDeadline', s.item_deadline_at,
      'itemFinalizedAt', s.item_finalized_at,
      'challenge',
        case when s.status = 'active'
          then case when s.stage_no = 1 then s.config -> 'questions'
                    else s.config -> 'maps' end -> s.active_index
          else null end,
      'progress', jsonb_build_object(
        'total', (select count(*) from arena.teams tm where tm.room_id = s.room_id),
        'submitted', (
          select count(distinct a.team_id)
          from arena.submission_attempts a
          where a.round_id = s.round_id
            and a.item_id = (
              case when s.stage_no = 1 then s.config -> 'scenarioIds'
                   else s.config -> 'levelIds' end ->> s.active_index
            )
        )
      )
    )
    || case when p_role = 'mc' or (s.status = 'finalized' and p_role <> 'presentation')
            then jsonb_build_object('config', s.config) else '{}'::jsonb end
    || case when p_role = 'mc' then jsonb_build_object(
        'teamStatus', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'name', tm.name,
            'submitted', exists(
              select 1 from arena.submission_attempts a
              where a.round_id = s.round_id and a.team_id = tm.id
                and a.item_id = (
                  case when s.stage_no = 1 then s.config -> 'scenarioIds'
                       else s.config -> 'levelIds' end ->> s.active_index
                )
            )
          )), '[]'::jsonb)
          from arena.teams tm where tm.room_id = s.room_id
        )
      ) else '{}'::jsonb end
    order by s.stage_no
  ), '[]'::jsonb) into stages
  from jsonb_array_elements(result -> 'stages') e
  join arena.competition_stages s
    on s.competition_id = c.id
    and s.stage_no = (e ->> 'stageNo')::integer;

  result := result || jsonb_build_object(
    'stages', stages,
    'demoStage', c.demo_stage
  );

  if p_role <> 'presentation' then
    result := result || jsonb_build_object(
      'joinCode', (
        select r.code
        from arena.competition_stages s
        join arena.rooms r on r.id = s.room_id
        where s.competition_id = c.id and s.stage_no = 1
      )
    );
  end if;

  return result;
end $$;

-- ───────────────────────────────────────────────────────────────────
-- 5. Re-assert ACLs (CREATE OR REPLACE retains restrictive grants)
-- ───────────────────────────────────────────────────────────────────
revoke all on function arena.competition_leaderboard(uuid) from public, anon, authenticated;
revoke all on function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text) from public, anon, authenticated;
revoke all on function arena.competition_state(uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function arena.competition_leaderboard(uuid) to service_role;
grant execute on function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text) to service_role;
grant execute on function arena.competition_state(uuid,text,text,uuid) to service_role;

commit;

-- SHA-256 of this file to be recorded before deployment.
-- Run: sha256sum 20261031020000_arena_competition_v4.sql
