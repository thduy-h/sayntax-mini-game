-- Migration: 20261031030000_arena_presentation_qr.sql
-- Enables persistent Competition Join QR, registered teams count, and closed challenge Before/After review
-- on the Public Presentation Screen (role = 'presentation').
-- Production safety: Idempotent and maintains strict read-only token isolation.

create or replace function arena.competition_state(
  p_id uuid,
  p_role text,
  p_hash text,
  p_team uuid default null
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

  -- ── Presentation path (public, persistent QR info, review for closed items, public leaderboard) ──
  if p_role = 'presentation' then
    result := result || jsonb_build_object(
      'joinCode', (
        select r.code
        from arena.competition_stages s
        join arena.rooms r on r.id = s.room_id
        where s.competition_id = c.id and s.stage_no = 1
      ),
      'demoStage', c.demo_stage,
      'teamsCount', (
        select count(*) from arena.competition_teams where competition_id = c.id
      ),
      'leaderboard', arena.competition_leaderboard(c.id),
      'stages', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'stageNo', s.stage_no, 'status', s.status,
            'startedAt', s.started_at, 'deadlineAt', s.deadline_at,
            'activeIndex', s.active_index,
            'itemFinalizedAt', s.item_finalized_at,
            'totalItems', case when s.stage_no = 1 then 6 else 4 end,
            'challenge', case when s.status = 'active'
              then case when s.stage_no = 1 then s.config -> 'questions' -> s.active_index
                        else s.config -> 'maps' -> s.active_index end
              else null end,
            'review', s.review
          ) order by s.stage_no
        ), '[]')
        from arena.competition_stages s
        where s.competition_id = c.id
      )
    );
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
        join arena.rounds rnd on rnd.id = sub.round_id
        join arena.competition_stages s on s.round_id = rnd.id
        where sub.team_id = t.id
      ), '[]'),
      'tieSubmitted', (
        c.tie_active and exists(
          select 1 from arena.submission_attempts a
          where a.round_id = c.tie_round_id and a.team_id = t.id
        )
      )
    ) into own;
    result := result || jsonb_build_object('own', own);
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'stageNo', (e ->> 'stageNo')::integer,
      'status', e ->> 'status',
      'roundId', e ->> 'roundId',
      'roomCode', e ->> 'roomCode',
      'startedAt', e ->> 'startedAt',
      'deadlineAt', e ->> 'deadlineAt',
      'activeIndex', (e ->> 'activeIndex')::integer,
      'itemStartedAt', s.item_started_at,
      'itemDeadline', s.item_deadline,
      'itemFinalizedAt', s.item_finalized_at,
      'review', s.review,
      'totalItems', case when s.stage_no = 1 then 6 else 4 end,
      'challenge', case when s.status = 'active'
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

  result := result || jsonb_build_object(
    'joinCode', (
      select r.code
      from arena.competition_stages s
      join arena.rooms r on r.id = s.room_id
      where s.competition_id = c.id and s.stage_no = 1
    )
  );

  return result;
end $$;

grant execute on function arena.competition_state(uuid, text, text, uuid) to service_role;
revoke execute on function arena.competition_state(uuid, text, text, uuid) from public, anon, authenticated;
