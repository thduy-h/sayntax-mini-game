-- Robot-only V5: MC-only skip; keep Stage 1 unplayed and untouched.
begin;
alter table arena.competitions add column competition_mode text not null default 'full'
  check (competition_mode in ('full','robot_only'));

alter function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text)
 rename to competition_control_before_robot_only;
create function arena.competition_control(
 p_id uuid,p_hash text,p_action text,p_stage integer default null,
 p_config jsonb default null,p_index integer default null,
 p_request uuid default null,p_presentation_hash text default null
) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare c arena.competitions; s arena.competition_stages;
begin
 if p_action<>'skip_stage_1' then
  return arena.competition_control_before_robot_only(
   p_id,p_hash,p_action,p_stage,p_config,p_index,p_request,p_presentation_hash);
 end if;
 c:=arena.competition_admin(p_id,p_hash);
 if c.rules_version<>'v5' or c.status<>'NOT_STARTED' or c.competition_mode<>'full'
 then raise exception 'invalid_transition'; end if;
 select * into s from arena.competition_stages
 where competition_id=p_id and stage_no=1 for update;
 if not found or s.status<>'pending' or s.round_id is not null
  or exists(select 1 from arena.competition_results where competition_id=p_id and stage_no=1)
 then raise exception 'invalid_transition'; end if;
 if not exists(select 1 from arena.competition_teams where competition_id=p_id)
 then raise exception 'no_teams'; end if;
 -- No fake Stage 1 round/results. Stage 1 stays pending in DB; mode projects 'skipped'.
 update arena.competitions set competition_mode='robot_only',
  status='STAGE_1_FINALIZED',demo_stage=null where id=p_id;
 return jsonb_build_object('ok',true,'competitionMode','robot_only');
end $$;

alter function arena.competition_leaderboard(uuid)
 rename to competition_leaderboard_before_robot_only;
create function arena.competition_leaderboard(p_id uuid) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare original jsonb;
begin
 original:=arena.competition_leaderboard_before_robot_only(p_id);
 if not exists(select 1 from arena.competitions
  where id=p_id and competition_mode='robot_only')
 then return original; end if;
 -- Stage 1 has no submissions: V5's Robot tie-break ordering remains correct.
 return (select coalesce(jsonb_agg(
  e||jsonb_build_object('accessibility50',0,
   'robot50',(e->>'robot')::numeric/4.0,
   'final100',(e->>'robot')::numeric/4.0)
  order by (e->>'rank')::integer,e->>'name'),'[]'::jsonb)
 from jsonb_array_elements(original) e);
end $$;

alter function arena.competition_state(uuid,text,text,uuid)
 rename to competition_state_before_robot_only;
create function arena.competition_state(
 p_id uuid,p_role text,p_hash text,p_team uuid default null
) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare result jsonb; mode_value text;
begin
 result:=arena.competition_state_before_robot_only(p_id,p_role,p_hash,p_team);
 select competition_mode into mode_value from arena.competitions where id=p_id;
 result:=result||jsonb_build_object('competitionMode',coalesce(mode_value,'full'));
 if mode_value='robot_only' then
  result:=jsonb_set(result,'{stages}',(
   select coalesce(jsonb_agg(
    case when e->>'stageNo'='1'
     then e||jsonb_build_object('status','skipped') else e end
     order by (e->>'stageNo')::integer),'[]'::jsonb)
   from jsonb_array_elements(result->'stages') e));
 end if;
 return result;
end $$;

revoke all on function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text),
 arena.competition_leaderboard(uuid),arena.competition_state(uuid,text,text,uuid)
 from public,anon,authenticated;
grant execute on function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text),
 arena.competition_leaderboard(uuid),arena.competition_state(uuid,text,text,uuid)
 to service_role;
commit;
