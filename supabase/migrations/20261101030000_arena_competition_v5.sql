-- V5: versioned new competitions only. Existing official records/rules untouched.
-- Requires deployed V3 plus 20261101020000 display sync; NOT the older V4/QR drafts.
-- Lock order: competition -> stage -> room -> round -> room-team -> attempt/score.
begin;
alter table arena.competitions
 add column rules_version text not null default 'legacy',
 add column ceremony_phase text not null default 'waiting' check(ceremony_phase in ('waiting','intro','ranking','winner','explanation','closing')),
 add column results_published_at timestamptz,
 add column robot_demo jsonb not null default '{"version":0,"commands":[],"trace":[{"x":0,"y":2,"direction":1,"blocked":false,"goal":false}],"status":"idle","currentStepIndex":0,"explanation":false}'::jsonb;
alter table arena.submission_attempts
 add column commands_used integer check(commands_used between 0 and 24),
 add column optimal_commands integer check(optimal_commands between 0 and 24),
 add column official_run_no integer check(official_run_no>0),
 add column optimization boolean not null default false;
create unique index arena_official_robot_run on arena.submission_attempts(round_id,team_id,item_id,official_run_no) where official_run_no is not null;
alter table arena.competition_results add column official_runs integer not null default 0 check(official_runs>=0);
-- Inline cross-column CHECKs have PostgreSQL-generated names on the deployed V2.
-- Remove exactly the score-ceiling checks by definition, not guessed V4 names.
do $$ declare chk record; begin
 for chk in select conname from pg_constraint where conrelid='arena.competition_results'::regclass and contype='c' and (pg_get_constraintdef(oid) like '%raw_score%' or pg_get_constraintdef(oid) like '%perfect_count%') loop
  execute format('alter table arena.competition_results drop constraint %I',chk.conname);
 end loop;
end $$;
alter table arena.competition_results add constraint competition_results_raw_score_check check(raw_score>=0 and raw_score<=case when stage_no=1 then 600 else 400 end);

alter table arena.competition_results add constraint competition_results_perfect_count_check check(perfect_count between 0 and case when stage_no=1 then 6 else 4 end);

alter function arena.create_competition(text,text,text,text,jsonb,jsonb) rename to create_competition_pre_v5;
create function arena.create_competition(p_name text,p_hash text,p_code1 text,p_code2 text,p_config1 jsonb,p_config2 jsonb) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare r jsonb;
begin
 if jsonb_array_length(p_config1->'scenarioIds') is distinct from 6 or jsonb_array_length(p_config2->'levelIds') is distinct from 4 then raise exception 'invalid_competition'; end if;
 r:=arena.create_competition_pre_v5(p_name,p_hash,p_code1,p_code2,p_config1,p_config2);
 update arena.competitions set rules_version='v5' where id=(r->>'competitionId')::uuid;
 update arena.competition_stages set content_version='competition-v5-1' where competition_id=(r->>'competitionId')::uuid;
 return r;
end $$;

alter function arena.competition_leaderboard(uuid) rename to competition_leaderboard_pre_v5;
create function arena.competition_leaderboard(p_id uuid) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare result jsonb;
begin
 if (select rules_version from arena.competitions where id=p_id)<>'v5' then return arena.competition_leaderboard_pre_v5(p_id); end if;
 with totals as (
 select t.id,t.name,t.created_at,
 coalesce(max(r.raw_score) filter(where r.stage_no=1),0) a,
 coalesce(max(r.raw_score) filter(where r.stage_no=2),0) b,
 coalesce(max(r.perfect_count) filter(where r.stage_no=1),0) ap,
 coalesce(max(r.perfect_count) filter(where r.stage_no=2),0) bp,
 coalesce(max(r.official_runs) filter(where r.stage_no=2),0) runs
 from arena.competition_teams t left join arena.competition_results r on r.competition_team_id=t.id and r.competition_id=t.competition_id where t.competition_id=p_id group by t.id), ranked as (
 select *,dense_rank() over(order by (2*a+3*b) desc,bp desc,runs asc,ap desc,
 array(select coalesce((select ta.score from arena.competition_tie_answers ta where ta.competition_id=p_id and ta.competition_team_id=totals.id and ta.attempt=g),0) from generate_series(1,(select tie_index-case when tie_active then 1 else 0 end from arena.competitions where id=p_id)) g) desc) rank from totals)
 select coalesce(jsonb_agg(jsonb_build_object('teamId',id,'name',name,'accessibility',a,'robot',b,'accessibility50',a/12.0,'robot50',b/8.0,'final100',(2*a+3*b)/24.0,'perfectAccessibility',ap,'optimalRobot',bp,'officialRobotRuns',runs,'rank',rank) order by rank,created_at,id),'[]') into result from ranked;
 return result;
end $$;

create function arena.competition_control_v5_impl(p_id uuid,p_hash text,p_action text,p_stage integer default null,p_config jsonb default null,p_index integer default null,p_request uuid default null,p_presentation_hash text default null) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare c arena.competitions; s arena.competition_stages; rd uuid; rec arena.competition_recovery_requests; n integer; best integer;
begin
 c:=arena.competition_admin(p_id,p_hash);
 if c.status='FINALIZED' and p_action not in ('presentation_rotate','presentation_revoke','challenge') then raise exception 'competition_finalized'; end if;
 if p_action='show_demo' then
  select * into s from arena.competition_stages where competition_id=c.id and stage_no=p_stage for update;
  if not found or s.status<>'pending' or (p_stage=1 and c.status<>'NOT_STARTED') or (p_stage=2 and c.status<>'STAGE_1_FINALIZED') then raise exception 'invalid_transition'; end if;
  update arena.competitions set demo_stage=p_stage where id=c.id;
 elsif p_action in ('close_challenge','advance_challenge') then
  select * into s from arena.competition_stages where competition_id=c.id and stage_no=p_stage for update;
  if not found or s.status<>'active' or p_index is null or s.active_index<>p_index or s.deadline_at<=clock_timestamp() then raise exception 'invalid_transition'; end if;
  if s.item_finalized_at is null and clock_timestamp()<s.item_deadline_at and exists(
   select 1 from arena.teams t where t.room_id=s.room_id and not exists(select 1 from arena.submission_attempts a where a.round_id=s.round_id and a.team_id=t.id and a.item_id=(case when s.stage_no=1 then s.config->'scenarioIds' else s.config->'levelIds' end ->>s.active_index))) then raise exception 'teams_pending'; end if;
  if p_action='close_challenge' then
   if s.item_finalized_at is not null then raise exception 'invalid_transition'; end if;
   update arena.competition_stages set item_finalized_at=clock_timestamp() where competition_id=c.id and stage_no=p_stage;
  else
   if s.active_index>=(jsonb_array_length(case when p_stage=1 then s.config->'scenarioIds' else s.config->'levelIds' end)-1) then raise exception 'invalid_challenge'; end if;
   update arena.competition_stages set active_index=active_index+1,item_started_at=clock_timestamp(),item_deadline_at=least(deadline_at,clock_timestamp()+make_interval(secs=>case when p_stage=1 then 90 else 195 end)),item_finalized_at=null where competition_id=c.id and stage_no=p_stage;
  end if;
 elsif p_action='configure' then
  select * into s from arena.competition_stages where competition_id=c.id and stage_no=p_stage for update;
  if not found or s.status<>'pending' then raise exception 'configuration_frozen'; end if;
  update arena.competition_stages set config=p_config where competition_id=c.id and stage_no=p_stage;
 elsif p_action='start_stage' then
  if (p_stage=1 and c.status<>'NOT_STARTED') or (p_stage=2 and c.status<>'STAGE_1_FINALIZED') or p_stage not in (1,2) or p_stage is null then raise exception 'invalid_transition'; end if;
  if not exists(select 1 from arena.competition_teams where competition_id=c.id) then raise exception 'no_teams'; end if;
  select * into s from arena.competition_stages where competition_id=c.id and stage_no=p_stage for update;
  if s.status<>'pending' then raise exception 'invalid_transition'; end if;
  update arena.rooms set status='locked' where id=s.room_id;
  insert into arena.rounds(room_id,game,status,config,content_version,started_at)
   values(s.room_id,case when p_stage=1 then 'accessibility' else 'robot' end,'running',s.config,s.content_version,clock_timestamp()) returning id into rd;
  update arena.competition_stages set status='active',round_id=rd,started_at=clock_timestamp(),deadline_at=clock_timestamp()+make_interval(secs=>case when p_stage=1 then 600 else 900 end),active_index=0,item_started_at=clock_timestamp(),item_deadline_at=clock_timestamp()+make_interval(secs=>case when p_stage=1 then 90 else 195 end),item_finalized_at=null where competition_id=c.id and stage_no=p_stage;
  update arena.rooms set status='running',config=jsonb_build_object('roundId',rd),version=version+1 where id=s.room_id;
  update arena.competitions set demo_stage=null,status=case when p_stage=1 then 'STAGE_1_ACTIVE' else 'STAGE_2_ACTIVE' end where id=c.id;
 elsif p_action='finalize_stage' then
  if (p_stage=1 and c.status<>'STAGE_1_ACTIVE') or (p_stage=2 and c.status<>'STAGE_2_ACTIVE') or p_stage not in (1,2) or p_stage is null then raise exception 'invalid_transition'; end if;
  select * into s from arena.competition_stages where competition_id=c.id and stage_no=p_stage for update;
  if clock_timestamp()<s.deadline_at and (s.active_index<>(jsonb_array_length(case when p_stage=1 then s.config->'scenarioIds' else s.config->'levelIds' end)-1) or s.item_finalized_at is null) then raise exception 'challenges_pending'; end if;
  -- Same competition lock as submissions, so all earlier accepted writes are included.
  perform 1 from arena.rooms where id=s.room_id for update;
  perform 1 from arena.rounds where id=s.round_id for update;
  insert into arena.competition_results(competition_id,stage_no,competition_team_id,raw_score,perfect_count,official_runs)
   select c.id,p_stage,ct.id,coalesce(sum(sub.verified_score) filter(where sub.verified),0),count(*) filter(where sub.verified and (case when p_stage=1 then sub.verified_score=100 else (sub.payload->'verification'->>'commandsUsed')::integer=(sub.payload->'verification'->>'optimalCommands')::integer end)),(select count(*) from arena.submission_attempts a where a.round_id=s.round_id and a.team_id=t.id)
   from arena.competition_teams ct left join arena.teams t on t.competition_team_id=ct.id and t.room_id=s.room_id
   left join arena.submissions sub on sub.team_id=t.id and sub.round_id=s.round_id
   where ct.competition_id=c.id group by ct.id,t.id;
  update arena.rounds set status='completed',ended_at=clock_timestamp() where id=s.round_id;
  update arena.rooms set status='locked',version=version+1 where id=s.room_id;
  update arena.competition_stages set status='finalized',finalized_at=clock_timestamp(),item_finalized_at=coalesce(item_finalized_at,clock_timestamp()) where competition_id=c.id and stage_no=p_stage;
  update arena.competitions set status=case when p_stage=1 then 'STAGE_1_FINALIZED' else 'STAGE_2_FINALIZED' end where id=c.id;
  if p_stage=2 then
   update arena.competitions set tie_candidates=array(select (e->>'teamId')::uuid from jsonb_array_elements(arena.competition_leaderboard(c.id)) e where (e->>'rank')::integer=1) where id=c.id;
  end if;
 elsif p_action='publish' then
  if c.status<>'STAGE_2_FINALIZED' or c.tie_active or cardinality(c.tie_candidates)<>1 then raise exception 'tie_unresolved'; end if;
  update arena.competitions set status='FINALIZED',winner_team_id=tie_candidates[1] where id=c.id;
 elsif p_action='start_tiebreak' then
  if c.status<>'STAGE_2_FINALIZED' or cardinality(c.tie_candidates)<2 or c.tie_active then raise exception 'invalid_transition'; end if;
  update arena.competitions set tie_active=true,tie_index=tie_index+1,tie_deadline_at=clock_timestamp()+interval '3 minutes' where id=c.id;
 elsif p_action='finalize_tiebreak' then
  if not c.tie_active then raise exception 'invalid_transition'; end if;
  select count(*),coalesce(max(score),0) into n,best from arena.competition_tie_answers where competition_id=c.id and attempt=c.tie_index and competition_team_id=any(c.tie_candidates);
  if n<cardinality(c.tie_candidates) and clock_timestamp()<c.tie_deadline_at then raise exception 'tie_answers_pending'; end if;
  update arena.competitions set tie_candidates=array(select id from unnest(c.tie_candidates) id where coalesce((select score from arena.competition_tie_answers where competition_id=c.id and attempt=c.tie_index and competition_team_id=id),0)=best),tie_active=false where id=c.id;
 elsif p_action='challenge' then
  raise exception 'mc_progression_required';
 elsif p_action='presentation_rotate' then
  if p_presentation_hash is null or length(p_presentation_hash)<>64 then raise exception 'invalid_token'; end if;
  update arena.competitions set presentation_hash=p_presentation_hash,presentation_expires_at=least(expires_at,clock_timestamp()+interval '8 hours'),presentation_revoked_at=null where id=c.id;
 elsif p_action='presentation_revoke' then
  update arena.competitions set presentation_revoked_at=clock_timestamp() where id=c.id;
 elsif p_action='approve_recovery' then
  select * into rec from arena.competition_recovery_requests where id=p_request and competition_id=c.id for update;
  if not found or rec.approved or rec.expires_at<=clock_timestamp() then raise exception 'invalid_recovery_request'; end if;
  update arena.competition_teams set recovery_hash=rec.recovery_hash,recovery_revoked_at=null where id=rec.competition_team_id;
  update arena.teams set token_revoked_at=clock_timestamp() where competition_team_id=rec.competition_team_id;
  update arena.competition_recovery_requests set approved=true where id=rec.id;
 else raise exception 'invalid_action'; end if;
 return jsonb_build_object('ok',true);
end $$;

create function arena.robot_level_summary(p_round uuid,p_team uuid,p_item text,p_reveal boolean default false) returns jsonb
language sql security invoker set search_path=pg_catalog as $$
 with a as (select * from arena.submission_attempts where round_id=p_round and team_id=p_team and item_id=p_item),
 stats as (select count(*) runs,count(*) filter(where optimization) opts,max(calculated_score) filter(where successful) base,
 min(commands_used) filter(where successful) best,min(optimal_commands) optimal,
 (array_agg(commands_used order by official_run_no) filter(where successful))[1] first from a)
 select jsonb_build_object('itemId',p_item,'canonicalVersion','competition-v5-1','successful',base is not null,
 'firstCommands',first,'bestCommands',best,'bestBaseScore',coalesce(base,0),'officialRuns',runs,
 'optimizationAttempts',opts,'penalty',5*opts,'finalScore',case when base is null then 0 else greatest(0,base-5*opts) end,
 'isOptimal',coalesce(base=100,false),
 'history',coalesce((select jsonb_agg(jsonb_build_object('run',official_run_no,'successful',successful,'commandsUsed',commands_used,'baseScore',calculated_score,'optimization',optimization) order by official_run_no) from a),'[]'))
 || case when p_reveal then jsonb_build_object('optimalCommands',optimal,'extraCommands',greatest(0,best-optimal)) else '{}'::jsonb end from stats
$$;

alter function arena.process_submission(uuid,uuid,text,text,text,text,jsonb,boolean,integer,text,jsonb) rename to process_submission_pre_v5;
create function arena.process_submission(p_round_id uuid,p_team_id uuid,p_token_hash text,p_game text,p_item_id text,p_idempotency_key text,p_payload jsonb,p_successful boolean,p_score integer,p_content_version text,p_config jsonb) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare cid uuid; c arena.competitions; s arena.competition_stages; r arena.rooms; rd arena.rounds; t arena.teams;
 old arena.submission_attempts; scored arena.submissions; summary jsonb; result jsonb;
 used integer; optimal integer; runs integer; opts integer; had_success boolean; previous_base integer; best_payload jsonb; final_score integer; is_better boolean;
begin
 select rooms.competition_id into cid from arena.rounds join arena.rooms on rooms.id=rounds.room_id where rounds.id=p_round_id;
 select * into c from arena.competitions where id=cid for share;
 if c.rules_version is distinct from 'v5' or p_game<>'robot' then
  return arena.process_submission_pre_v5(p_round_id,p_team_id,p_token_hash,p_game,p_item_id,p_idempotency_key,p_payload,p_successful,p_score,p_content_version,p_config);
 end if;
 select * into s from arena.competition_stages where competition_id=cid and round_id=p_round_id for share;
 if not found then raise exception 'forbidden'; end if;
 select * into r from arena.rooms where id=s.room_id for share;
 select * into rd from arena.rounds where id=p_round_id for share;
 select * into t from arena.teams where id=p_team_id and room_id=r.id for update;
 if not found or p_token_hash is null or t.join_token_hash<>p_token_hash or t.token_revoked_at is not null or t.token_expires_at<=clock_timestamp()
 or t.competition_team_id is null or not exists(select 1 from arena.competition_teams where id=t.competition_team_id and competition_id=cid)
 or c.expires_at<=clock_timestamp() or r.expires_at<=clock_timestamp() then raise exception 'forbidden'; end if;
 select * into old from arena.submission_attempts where round_id=p_round_id and team_id=p_team_id and idempotency_key=p_idempotency_key;
 if found then
  if old.item_id<>p_item_id or old.payload<>p_payload then raise exception 'invalid_idempotency_reuse'; end if;
  return old.response||jsonb_build_object('duplicate',true);
 end if;
 if s.status<>'active' or c.status<>'STAGE_2_ACTIVE' or s.deadline_at<=clock_timestamp() then raise exception 'stage_closed'; end if;
 if s.item_finalized_at is not null or s.item_deadline_at<=clock_timestamp() or p_item_id is distinct from (s.config->'levelIds'->>s.active_index) then raise exception 'inactive_challenge'; end if;
 if r.status<>'running' or rd.status<>'running' or rd.game<>'robot' then raise exception 'round_not_running'; end if;
 if rd.content_version is distinct from p_content_version or rd.config is distinct from p_config then raise exception 'round_content_mismatch'; end if;
 used:=(p_payload->'verification'->>'commandsUsed')::integer;
 optimal:=(p_payload->'verification'->>'optimalCommands')::integer;
 if p_idempotency_key is null or length(p_idempotency_key) not between 1 and 200 or p_successful is null or p_score is null
 or used is null or used not between 0 and 24 or optimal is null or optimal not between 1 and 24 or (p_successful and used<optimal)
 or jsonb_typeof(p_payload->'commands') is distinct from 'array' or jsonb_array_length(p_payload->'commands')<used
 or p_score is distinct from (case when p_successful then greatest(60,100-8*greatest(0,used-optimal)) else 0 end) then raise exception 'invalid_verified_submission'; end if;
 select count(*),count(*) filter(where optimization),coalesce(bool_or(successful),false),max(calculated_score) filter(where successful)
 into runs,opts,had_success,previous_base from arena.submission_attempts where round_id=p_round_id and team_id=p_team_id and item_id=p_item_id;
 if exists(select 1 from arena.submission_attempts where round_id=p_round_id and team_id=p_team_id and item_id=p_item_id and optimal_commands<>optimal) then raise exception 'round_content_mismatch'; end if;
 if had_success then
  if (p_payload->>'optimization') is distinct from 'true' then raise exception 'optimization_required'; end if;
  if opts>=2 then raise exception 'optimization_limit'; end if;
  if previous_base=100 then raise exception 'already_optimal'; end if;
 elsif (p_payload->>'optimization') is distinct from 'false' then raise exception 'invalid_optimization'; end if;
 insert into arena.submission_attempts(round_id,team_id,item_id,idempotency_key,payload,successful,calculated_score,commands_used,optimal_commands,official_run_no,optimization)
 values(p_round_id,p_team_id,p_item_id,p_idempotency_key,p_payload,p_successful,p_score,used,optimal,runs+1,had_success);
 select * into scored from arena.submissions where round_id=p_round_id and team_id=p_team_id and item_id=p_item_id;
 summary:=arena.robot_level_summary(p_round_id,p_team_id,p_item_id,false);
 if had_success or p_successful then
  is_better:=p_successful and (not had_success or p_score>previous_base or used<(scored.payload->'verification'->>'commandsUsed')::integer);
  best_payload:=case when is_better then p_payload else scored.payload end;
  final_score:=(summary->>'finalScore')::integer;
  insert into arena.submissions(round_id,team_id,item_id,idempotency_key,payload,verified_score,verified)
   values(p_round_id,p_team_id,p_item_id,p_idempotency_key,best_payload,final_score,true)
  on conflict(round_id,team_id,item_id) do update set payload=excluded.payload,verified_score=excluded.verified_score,verified=true,
   idempotency_key=case when is_better then excluded.idempotency_key else arena.submissions.idempotency_key end;
 end if;
 result:=jsonb_build_object('accepted',true,'verified',p_successful,'duplicate',false,'level',summary,
 'score',coalesce((select score from arena.team_scores where round_id=p_round_id and team_id=p_team_id),0));
 update arena.submission_attempts set response=result where round_id=p_round_id and team_id=p_team_id and idempotency_key=p_idempotency_key;
 return result;
end $$;
-- Canonical history cannot be edited after snapshot finalization.
create trigger protect_competition_attempts before insert or update or delete on arena.submission_attempts for each row execute function arena.protect_competition_scores();

-- Demo trace is computed on the server, entirely outside official attempts/scores.
create function arena.robot_demo_trace(p_commands jsonb) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare x integer:=0; y integer:=2; d integer:=1; nx integer; ny integer; cmd text; blocked boolean; goal boolean; trace jsonb:='[{"x":0,"y":2,"direction":1,"blocked":false,"goal":false}]';
begin
 if jsonb_typeof(p_commands) is distinct from 'array' or jsonb_array_length(p_commands)>24 then raise exception 'invalid_commands'; end if;
 for cmd in select jsonb_array_elements_text(p_commands) loop
  blocked:=false;
  if cmd='left' then d:=(d+3)%4;
  elsif cmd='right' then d:=(d+1)%4;
  elsif cmd='forward' then
   nx:=x+(array[0,1,0,-1])[d+1]; ny:=y+(array[-1,0,1,0])[d+1];
   blocked:=nx<0 or nx>3 or ny<0 or ny>3 or (nx=2 and ny=2) or (nx=1 and ny=3);
   if not blocked then x:=nx;y:=ny;end if;
  else raise exception 'invalid_commands'; end if;
  goal:=x=2 and y=1;
  trace:=trace||jsonb_build_array(jsonb_build_object('x',x,'y',y,'direction',d,'blocked',blocked,'goal',goal));
  exit when blocked or goal;
 end loop;
 return trace;
end $$;

create function arena.robot_demo_snapshot(p_demo jsonb) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare n integer:=coalesce((p_demo->>'currentStepIndex')::integer,0); last_step integer:=jsonb_array_length(p_demo->'trace')-1; status text:=p_demo->>'status';
begin
 if status='running' then
  n:=least(last_step,n+greatest(0,floor(extract(epoch from (clock_timestamp()-(p_demo->>'startedAt')::timestamptz))/0.5)::integer));
  if n=last_step then status:=case when (p_demo->'trace'->n->>'goal')::boolean then 'completed' else 'failed' end; end if;
 end if;
 return p_demo||jsonb_build_object('currentStepIndex',n,'playbackOriginStep',(p_demo->>'currentStepIndex')::integer,'status',status,'serverNow',clock_timestamp());
end $$;
alter function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text) rename to competition_control_pre_v5;
create function arena.competition_control(p_id uuid,p_hash text,p_action text,p_stage integer default null,p_config jsonb default null,p_index integer default null,p_request uuid default null,p_presentation_hash text default null) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare c arena.competitions; result jsonb; demo jsonb; op text; phase text; n integer; ver integer;
begin
 c:=arena.competition_admin(p_id,p_hash);
 if c.rules_version<>'v5' then
  if p_action='configure' and jsonb_array_length(p_config->(case when p_stage=1 then 'scenarioIds' else 'levelIds' end)) is distinct from
   (select jsonb_array_length(config->(case when p_stage=1 then 'scenarioIds' else 'levelIds' end)) from arena.competition_stages where competition_id=p_id and stage_no=p_stage) then raise exception 'configuration_frozen'; end if;
  return arena.competition_control_pre_v5(p_id,p_hash,p_action,p_stage,p_config,p_index,p_request,p_presentation_hash);
 end if;
 if p_action='robot_demo' then
  if c.demo_stage is distinct from 2 or c.status<>'STAGE_1_FINALIZED' then raise exception 'invalid_transition'; end if;
  demo:=arena.robot_demo_snapshot(c.robot_demo); ver:=(demo->>'version')::integer;
  if (p_config->>'version')::integer is distinct from ver then raise exception 'stale_demo_version'; end if;
  op:=p_config->>'op';
  if op='queue' then demo:=demo||jsonb_build_object('commands',p_config->'commands','trace',arena.robot_demo_trace(p_config->'commands'),'currentStepIndex',0,'status','editing','explanation',false);
  elsif op in ('run','resume') then
   if jsonb_array_length(demo->'commands')=0 then raise exception 'invalid_commands'; end if;
   if demo->>'status' in ('completed','failed') then demo:=demo||'{"currentStepIndex":0}'::jsonb; end if;
   demo:=demo||jsonb_build_object('status','running','startedAt',clock_timestamp());
  elsif op='pause' then demo:=demo||'{"status":"paused"}'::jsonb;
  elsif op='step' then
   n:=least(jsonb_array_length(demo->'trace')-1,(demo->>'currentStepIndex')::integer+1);
   demo:=demo||jsonb_build_object('currentStepIndex',n,'status',case when n=jsonb_array_length(demo->'trace')-1 and n>0 then case when (demo->'trace'->n->>'goal')::boolean then 'completed' else 'failed' end else 'paused' end);
  elsif op='reset' then demo:=demo||'{"currentStepIndex":0,"status":"idle","explanation":false}'::jsonb;
  elsif op='explain' then demo:=demo||jsonb_build_object('explanation',true,'solution',jsonb_build_array('forward','left','forward','right','forward'));
  else raise exception 'invalid_action'; end if;
  if op in ('queue','reset') then demo:=demo-'solution'; end if;
  demo:=demo||jsonb_build_object('version',ver+1,'updatedAt',clock_timestamp());
  update arena.competitions set robot_demo=demo where id=p_id;
  return jsonb_build_object('ok',true,'demo',arena.robot_demo_snapshot(demo));
 elsif p_action='end_demo' then
  if c.demo_stage is null then raise exception 'invalid_transition'; end if;
  update arena.competitions set demo_stage=null where id=p_id;
  return '{"ok":true}'::jsonb;
 elsif p_action='ceremony' then
  if c.status not in ('STAGE_2_FINALIZED','FINALIZED') then raise exception 'invalid_transition'; end if;
  phase:=p_config->>'phase';
  if p_config->>'expectedPhase' is distinct from c.ceremony_phase then raise exception 'invalid_transition'; end if;
  if not ((c.ceremony_phase='waiting' and phase='intro') or (c.ceremony_phase='intro' and phase='ranking') or (c.ceremony_phase='ranking' and phase='winner') or (c.ceremony_phase='winner' and phase='explanation') or (c.ceremony_phase='explanation' and phase='closing')) then raise exception 'invalid_transition'; end if;
  if phase='ranking' then
   result:=arena.competition_control_v5_impl(p_id,p_hash,'publish');
   update arena.competitions set results_published_at=clock_timestamp() where id=p_id;
  end if;
  update arena.competitions set ceremony_phase=phase where id=p_id;
  return '{"ok":true}'::jsonb;
 elsif p_action='publish' then raise exception 'ceremony_required';
 elsif p_action='set_a11y_view' then
  return arena.competition_control_pre_v5(p_id,p_hash,p_action,p_stage,p_config,p_index,p_request,p_presentation_hash);
 end if;
 if p_action='configure' and (jsonb_array_length(p_config->case when p_stage=1 then 'scenarioIds' else 'levelIds' end) is distinct from (case when p_stage=1 then 6 else 4 end)) then raise exception 'invalid_competition'; end if;
 result:=arena.competition_control_v5_impl(p_id,p_hash,p_action,p_stage,p_config,p_index,p_request,p_presentation_hash);
 if p_action in ('show_demo','start_stage','advance_challenge') then update arena.competitions set a11y_view_mode='before',a11y_view_scope=null where id=p_id; end if;
 return result;
end $$;

create function arena.competition_score_explanation(p_id uuid,p_ct uuid) returns jsonb
language sql security invoker set search_path=pg_catalog as $$
 select jsonb_build_object('teamId',ct.id,'name',ct.name,
 'accessibility',coalesce((select jsonb_agg(jsonb_build_object('itemId',q.value,'label',coalesce(s.config->'questions'->(q.ordinality::integer-1)->>'title',q.value),'score',coalesce(sub.verified_score,0),'maximum',100) order by q.ordinality)
 from arena.competition_stages s join arena.teams t on t.room_id=s.room_id and t.competition_team_id=ct.id
 cross join lateral jsonb_array_elements_text(s.config->'scenarioIds') with ordinality q(value,ordinality)
 left join arena.submissions sub on sub.round_id=s.round_id and sub.team_id=t.id and sub.item_id=q.value and sub.verified
 where s.competition_id=p_id and s.stage_no=1 and s.status='finalized'),'[]'),
 'robot',coalesce((select jsonb_agg(arena.robot_level_summary(s.round_id,t.id,q.value,true)||jsonb_build_object('label',coalesce(s.config->'maps'->(q.ordinality::integer-1)->>'name',q.value)) order by q.ordinality)
 from arena.competition_stages s join arena.teams t on t.room_id=s.room_id and t.competition_team_id=ct.id
 cross join lateral jsonb_array_elements_text(s.config->'levelIds') with ordinality q(value,ordinality)
 where s.competition_id=p_id and s.stage_no=2 and s.status='finalized'),'[]'),
 'totals',(select e from jsonb_array_elements(arena.competition_leaderboard(p_id)) e where e->>'teamId'=ct.id::text))
 from arena.competition_teams ct where ct.competition_id=p_id and ct.id=p_ct
$$;

alter function arena.competition_state(uuid,text,text,uuid) rename to competition_state_pre_v5;
create function arena.competition_state(p_id uuid,p_role text,p_hash text,p_team uuid default null) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare result jsonb; c arena.competitions; ct uuid; public_explanation jsonb;
begin
 result:=arena.competition_state_pre_v5(p_id,p_role,p_hash,p_team);
 select * into c from arena.competitions where id=p_id;
 if c.rules_version<>'v5' then return result; end if;
 result:=result||jsonb_build_object('rulesVersion','v5','resultsState',case when c.results_published_at is not null then 'RESULTS_PUBLISHED' when c.status='STAGE_2_FINALIZED' then 'RESULTS_READY' else c.status end,'ceremonyPhase',c.ceremony_phase,
 'joinCode',(select r.code from arena.competition_stages s join arena.rooms r on r.id=s.room_id where s.competition_id=p_id and s.stage_no=1),'teamsCount',(select count(*) from arena.competition_teams where competition_id=p_id));
 result:=jsonb_set(result,'{stages}',(select jsonb_agg(e||jsonb_build_object('totalItems',jsonb_array_length(s.config->case when s.stage_no=1 then 'scenarioIds' else 'levelIds' end)) order by s.stage_no) from jsonb_array_elements(result->'stages') e join arena.competition_stages s on s.competition_id=p_id and s.stage_no=(e->>'stageNo')::integer));
 if c.demo_stage=2 then result:=result||jsonb_build_object('robotDemo',arena.robot_demo_snapshot(c.robot_demo)); end if;
 if p_role='mc' then
  result:=result||jsonb_build_object('scoreExplanations',(select coalesce(jsonb_agg(arena.competition_score_explanation(p_id,id)),'[]') from arena.competition_teams where competition_id=p_id));
 elsif p_role='team' then
  select competition_team_id into ct from arena.teams where id=p_team;
  result:=result||jsonb_build_object('scoreExplanations',jsonb_build_array(arena.competition_score_explanation(p_id,ct)),
   'robotLevels',(select coalesce(jsonb_agg(arena.robot_level_summary(s.round_id,t.id,item.value,s.status='finalized')),'[]')
    from arena.competition_stages s join arena.teams t on t.room_id=s.room_id and t.competition_team_id=ct
    cross join lateral jsonb_array_elements_text(s.config->'levelIds') item(value) where s.competition_id=p_id and s.stage_no=2));
  if c.results_published_at is null and c.status='STAGE_2_FINALIZED' then result:=result-'leaderboard'-'tie'; end if;
 end if;
 if p_role<>'mc' and c.ceremony_phase not in ('winner','explanation','closing') then result:=result#-'{competition,winnerTeamId}'; end if;
 if p_role='presentation' then
  result:=result-'leaderboard'-'scoreExplanations';
  if c.results_published_at is not null then result:=result||jsonb_build_object('leaderboard',arena.competition_leaderboard(p_id)); end if;
  if c.ceremony_phase='explanation' then
   public_explanation:=arena.competition_score_explanation(p_id,c.winner_team_id);
   public_explanation:=jsonb_set(public_explanation,'{robot}',(select coalesce(jsonb_agg(e-'history'),'[]') from jsonb_array_elements(public_explanation->'robot') e));
   result:=result||jsonb_build_object('scoreExplanations',jsonb_build_array(public_explanation));
  end if;
 end if;
 return result;
end $$;

create function arena.freeze_competition_rules() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$
begin
 if new.rules_version is distinct from old.rules_version and (old.status<>'NOT_STARTED' or exists(select 1 from arena.competition_teams where competition_id=old.id)) then raise exception 'configuration_frozen'; end if;
 return new;
end $$;
create trigger freeze_competition_rules before update on arena.competitions for each row execute function arena.freeze_competition_rules();
-- Explicit grants for every new function; retained originals keep prior restricted ACLs.
revoke all on function arena.create_competition(text,text,text,text,jsonb,jsonb),arena.competition_leaderboard(uuid),arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text),arena.competition_state(uuid,text,text,uuid),arena.process_submission(uuid,uuid,text,text,text,text,jsonb,boolean,integer,text,jsonb),arena.robot_level_summary(uuid,uuid,text,boolean),arena.robot_demo_trace(jsonb),arena.robot_demo_snapshot(jsonb),arena.competition_score_explanation(uuid,uuid),arena.competition_control_v5_impl(uuid,text,text,integer,jsonb,integer,uuid,text),arena.freeze_competition_rules() from public,anon,authenticated;
grant execute on function arena.create_competition(text,text,text,text,jsonb,jsonb),arena.competition_leaderboard(uuid),arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text),arena.competition_state(uuid,text,text,uuid),arena.process_submission(uuid,uuid,text,text,text,text,jsonb,boolean,integer,text,jsonb),arena.robot_level_summary(uuid,uuid,text,boolean),arena.robot_demo_trace(jsonb),arena.robot_demo_snapshot(jsonb),arena.competition_score_explanation(uuid,uuid),arena.competition_control_v5_impl(uuid,text,text,integer,jsonb,integer,uuid,text) to service_role;
commit;
