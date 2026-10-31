-- Local rollback only; never discard attempts written under the new policy.
-- Refuse restoring the old optimal-run restriction once new-policy attempts exist.
begin;
do $$ begin
 if exists(select 1 from arena.submission_attempts a join arena.rounds r on r.id=a.round_id where r.config->>'executionPolicy'='run-only-v1') then
  raise exception 'forward_fix_required';
 end if;
end $$;
create or replace function arena.robot_level_summary(p_round uuid,p_team uuid,p_item text,p_reveal boolean default false) returns jsonb
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

create or replace function arena.process_submission(p_round_id uuid,p_team_id uuid,p_token_hash text,p_game text,p_item_id text,p_idempotency_key text,p_payload jsonb,p_successful boolean,p_score integer,p_content_version text,p_config jsonb) returns jsonb
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
revoke all on function arena.robot_level_summary(uuid,uuid,text,boolean),arena.process_submission(uuid,uuid,text,text,text,text,jsonb,boolean,integer,text,jsonb) from public,anon,authenticated;
grant execute on function arena.robot_level_summary(uuid,uuid,text,boolean),arena.process_submission(uuid,uuid,text,text,text,text,jsonb,boolean,integer,text,jsonb) to service_role;
commit;
