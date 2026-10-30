-- Additive Competition V2. Deployed 20261030100000 is deliberately untouched.
-- Lock order: competition -> stage -> room -> round -> room-team -> attempts/scores.
-- Submission SHARE locks allow separate teams to proceed independently.
begin;
create table arena.competitions (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100),
 status text not null default 'NOT_STARTED' check(status in ('NOT_STARTED','STAGE_1_ACTIVE','STAGE_1_FINALIZED','STAGE_2_ACTIVE','STAGE_2_FINALIZED','FINALIZED')),
 mc_token_hash text not null, expires_at timestamptz not null default now()+interval '48 hours', mc_revoked_at timestamptz,
 presentation_hash text, presentation_expires_at timestamptz, presentation_revoked_at timestamptz,
 tie_candidates uuid[] not null default '{}', tie_index integer not null default 0, tie_active boolean not null default false,
 tie_deadline_at timestamptz, winner_team_id uuid, created_at timestamptz not null default now()
);
create table arena.competition_teams (
 id uuid primary key default gen_random_uuid(), competition_id uuid not null references arena.competitions(id),
 name text not null check(length(name) between 2 and 40), recovery_hash text not null, recovery_revoked_at timestamptz,
 created_at timestamptz not null default now(), unique(competition_id,id), unique(competition_id,name), unique(competition_id,recovery_hash)
);
alter table arena.competitions add constraint arena_competition_winner_fk foreign key(id,winner_team_id) references arena.competition_teams(competition_id,id);
alter table arena.rooms add column competition_id uuid references arena.competitions(id);
alter table arena.teams add column competition_team_id uuid references arena.competition_teams(id);
create unique index arena_room_competition_team on arena.teams(room_id,competition_team_id) where competition_team_id is not null;
create table arena.competition_stages (
 competition_id uuid not null references arena.competitions(id), stage_no integer not null check(stage_no in (1,2)),
 room_id uuid not null unique references arena.rooms(id), round_id uuid unique references arena.rounds(id),
 status text not null default 'pending' check(status in ('pending','active','finalized')),
 config jsonb not null, content_version text not null default 'competition-v2-1',
 active_index integer not null default 0 check(active_index>=0), started_at timestamptz, deadline_at timestamptz, finalized_at timestamptz,
 primary key(competition_id,stage_no), check(deadline_at is null or deadline_at>started_at)
);
create table arena.competition_results (
 competition_id uuid not null, stage_no integer not null, competition_team_id uuid not null,
 raw_score integer not null check(raw_score>=0 and raw_score<=case when stage_no=1 then 400 else 300 end),
 perfect_count integer not null check(perfect_count between 0 and 4), finalized_at timestamptz not null default now(),
 primary key(competition_id,stage_no,competition_team_id),
 foreign key(competition_id,stage_no) references arena.competition_stages(competition_id,stage_no),
 foreign key(competition_id,competition_team_id) references arena.competition_teams(competition_id,id)
);
create table arena.competition_recovery_requests (
 id uuid primary key default gen_random_uuid(), competition_id uuid not null,
 competition_team_id uuid not null, recovery_hash text not null, expires_at timestamptz not null default now()+interval '15 minutes', approved boolean not null default false,
 foreign key(competition_id,competition_team_id) references arena.competition_teams(competition_id,id)
);
create table arena.competition_tie_answers (
 competition_id uuid not null, attempt integer not null, competition_team_id uuid not null, answer_id text not null,
 score integer not null check(score in (0,50,100)), primary key(competition_id,attempt,competition_team_id),
 foreign key(competition_id,competition_team_id) references arena.competition_teams(competition_id,id)
);

create function arena.competition_admin(p_id uuid,p_hash text) returns arena.competitions
language plpgsql security invoker set search_path=pg_catalog as $$
declare c arena.competitions;
begin
 select * into c from arena.competitions where id=p_id for update;
 if not found or p_hash is null or c.mc_token_hash<>p_hash or c.mc_revoked_at is not null or c.expires_at<=clock_timestamp() then raise exception 'forbidden'; end if;
 return c;
end $$;

create function arena.create_competition(p_name text,p_hash text,p_code1 text,p_code2 text,p_config1 jsonb,p_config2 jsonb) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare c arena.competitions; r1 uuid; r2 uuid;
begin
 if length(p_hash)<>64 or p_code1=p_code2 then raise exception 'invalid_competition'; end if;
 insert into arena.competitions(name,mc_token_hash) values(p_name,p_hash) returning * into c;
 insert into arena.rooms(code,mc_token_hash,mc_token_expires_at,expires_at,competition_id) values(p_code1,p_hash,c.expires_at,c.expires_at,c.id) returning id into r1;
 insert into arena.rooms(code,mc_token_hash,mc_token_expires_at,expires_at,competition_id) values(p_code2,p_hash,c.expires_at,c.expires_at,c.id) returning id into r2;
 insert into arena.competition_stages(competition_id,stage_no,room_id,config) values(c.id,1,r1,p_config1),(c.id,2,r2,p_config2);
 return jsonb_build_object('competitionId',c.id,'stage1Code',p_code1,'stage2Code',p_code2);
end $$;

create function arena.join_competition(p_code text,p_name text,p_recovery_hash text,p_team_hash text) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare cid uuid; c arena.competitions; s arena.competition_stages; ct arena.competition_teams; t arena.teams; other_room uuid;
begin
 select competition_id into cid from arena.rooms where code=p_code;
 select * into c from arena.competitions where id=cid for update;
 if not found or c.expires_at<=clock_timestamp() or c.status='FINALIZED' then raise exception 'not_found'; end if;
 select st.* into s from arena.competition_stages st join arena.rooms r on r.id=st.room_id where st.competition_id=c.id and r.code=p_code;
 if p_recovery_hash is null or length(p_recovery_hash)<>64 or p_team_hash is null or length(p_team_hash)<>64 then raise exception 'invalid_credential'; end if;
 select * into ct from arena.competition_teams where competition_id=c.id and recovery_hash=p_recovery_hash and recovery_revoked_at is null for update;
 if not found then
  if s.stage_no<>1 or c.status<>'NOT_STARTED' or p_name is null then raise exception 'forbidden'; end if;
  if (select count(*) from arena.competition_teams where competition_id=c.id)>=8 then raise exception 'room_team_limit_reached'; end if;
  insert into arena.competition_teams(competition_id,name,recovery_hash) values(c.id,p_name,p_recovery_hash) returning * into ct;
  -- Pre-associate both room teams before either starts. Stage 2 can never create a new competition identity.
  for other_room in select room_id from arena.competition_stages where competition_id=c.id order by stage_no loop
   insert into arena.teams(room_id,name,competition_team_id,join_token_hash,token_expires_at,token_revoked_at)
    values(other_room,ct.name,ct.id,p_recovery_hash,c.expires_at,clock_timestamp());
  end loop;
 end if;
 if s.stage_no=2 and c.status in ('NOT_STARTED','STAGE_1_ACTIVE') then raise exception 'stage_locked'; end if;
 update arena.teams set join_token_hash=p_team_hash,token_expires_at=c.expires_at,token_revoked_at=null
  where room_id=s.room_id and competition_team_id=ct.id returning * into t;
 return jsonb_build_object('competitionId',c.id,'competitionTeamId',ct.id,'team',jsonb_build_object('id',t.id,'name',t.name),'roomId',s.room_id);
end $$;

create function arena.competition_leaderboard(p_id uuid) returns jsonb
language sql security invoker set search_path=pg_catalog as $$
 with totals as (
 select t.id,t.name,t.created_at,
 coalesce(max(r.raw_score) filter(where r.stage_no=1),0) a,
 coalesce(max(r.raw_score) filter(where r.stage_no=2),0) b,
 coalesce(max(r.perfect_count) filter(where r.stage_no=1),0) ap,
 coalesce(max(r.perfect_count) filter(where r.stage_no=2),0) bp
 from arena.competition_teams t left join arena.competition_results r on r.competition_team_id=t.id and r.competition_id=t.competition_id
 where t.competition_id=p_id group by t.id), ranked as (
 select *,dense_rank() over(order by (3*a+4*b) desc,ap desc,bp desc,
 array(select coalesce((select ta.score from arena.competition_tie_answers ta where ta.competition_id=p_id and ta.competition_team_id=totals.id and ta.attempt=g),0)
 from generate_series(1,(select tie_index-case when tie_active then 1 else 0 end from arena.competitions where id=p_id)) g) desc) rank from totals)
 select coalesce(jsonb_agg(jsonb_build_object('teamId',id,'name',name,'accessibility',a,'robot',b,'accessibility50',a/8.0,'robot50',b/6.0,'final100',(3*a+4*b)/24.0,'perfectAccessibility',ap,'optimalRobot',bp,'rank',rank) order by rank,created_at,id),'[]') from ranked;
$$;

create function arena.competition_control(p_id uuid,p_hash text,p_action text,p_stage integer default null,p_config jsonb default null,p_index integer default null,p_request uuid default null,p_presentation_hash text default null) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare c arena.competitions; s arena.competition_stages; rd uuid; rec arena.competition_recovery_requests; n integer; best integer;
begin
 c:=arena.competition_admin(p_id,p_hash);
 if c.status='FINALIZED' and p_action not in ('presentation_rotate','presentation_revoke','challenge') then raise exception 'competition_finalized'; end if;
 if p_action='configure' then
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
   values(s.room_id,case when p_stage=1 then 'accessibility' else 'robot' end,'running',s.config,'competition-v2-1',clock_timestamp()) returning id into rd;
  update arena.competition_stages set status='active',round_id=rd,started_at=clock_timestamp(),deadline_at=clock_timestamp()+make_interval(secs=>case when p_stage=1 then 600 else 900 end),active_index=0 where competition_id=c.id and stage_no=p_stage;
  update arena.rooms set status='running',config=jsonb_build_object('roundId',rd),version=version+1 where id=s.room_id;
  update arena.competitions set status=case when p_stage=1 then 'STAGE_1_ACTIVE' else 'STAGE_2_ACTIVE' end where id=c.id;
 elsif p_action='finalize_stage' then
  if (p_stage=1 and c.status<>'STAGE_1_ACTIVE') or (p_stage=2 and c.status<>'STAGE_2_ACTIVE') or p_stage not in (1,2) or p_stage is null then raise exception 'invalid_transition'; end if;
  select * into s from arena.competition_stages where competition_id=c.id and stage_no=p_stage for update;
  -- Same competition lock as submissions, so all earlier accepted writes are included.
  perform 1 from arena.rooms where id=s.room_id for update;
  perform 1 from arena.rounds where id=s.round_id for update;
  insert into arena.competition_results(competition_id,stage_no,competition_team_id,raw_score,perfect_count)
   select c.id,p_stage,ct.id,coalesce(sum(sub.verified_score) filter(where sub.verified),0),count(*) filter(where sub.verified and sub.verified_score=100)
   from arena.competition_teams ct left join arena.teams t on t.competition_team_id=ct.id and t.room_id=s.room_id
   left join arena.submissions sub on sub.team_id=t.id and sub.round_id=s.round_id
   where ct.competition_id=c.id group by ct.id;
  update arena.rounds set status='completed',ended_at=clock_timestamp() where id=s.round_id;
  update arena.rooms set status='locked',version=version+1 where id=s.room_id;
  update arena.competition_stages set status='finalized',finalized_at=clock_timestamp() where competition_id=c.id and stage_no=p_stage;
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
  select * into s from arena.competition_stages where competition_id=c.id and stage_no=p_stage;
  if not found or p_index is null or p_index<0 or p_index>=jsonb_array_length(case when p_stage=1 then s.config->'questions' else s.config->'maps' end) then raise exception 'invalid_challenge'; end if;
  update arena.competition_stages set active_index=p_index where competition_id=c.id and stage_no=p_stage;
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

create function arena.request_competition_recovery(p_id uuid,p_team uuid,p_hash text) returns uuid
language plpgsql security invoker set search_path=pg_catalog as $$
declare req uuid; c arena.competitions;
begin
 select * into c from arena.competitions where id=p_id for update;
 if not found or c.expires_at<=clock_timestamp() or c.status='FINALIZED' or length(p_hash)<>64 then raise exception 'forbidden'; end if;
 if (select count(*) from arena.competition_recovery_requests where competition_id=p_id and expires_at>clock_timestamp() and not approved)>=20 then raise exception 'rate_limited'; end if;
 insert into arena.competition_recovery_requests(competition_id,competition_team_id,recovery_hash) values(p_id,p_team,p_hash) returning id into req;
 return req;
end $$;

-- Preserve the exact deployed legacy transaction for ordinary workshop rounds.
alter function arena.process_submission(uuid,uuid,text,text,text,text,jsonb,boolean,integer,text,jsonb) rename to process_workshop_submission;
create or replace function arena.process_submission(
  p_round_id uuid, p_team_id uuid, p_token_hash text, p_game text,
  p_item_id text, p_idempotency_key text, p_payload jsonb,
  p_successful boolean, p_score integer, p_content_version text, p_config jsonb
) returns jsonb language plpgsql security invoker set search_path = pg_catalog as $$
declare
  room_id uuid;
  cid uuid;
  c arena.competitions;
  stage arena.competition_stages;
  r arena.rooms%rowtype;
  rd arena.rounds%rowtype;
  t arena.teams%rowtype;
  previous_attempt arena.submission_attempts%rowtype;
  scored arena.submissions%rowtype;
  result jsonb;
  total integer;
  previous_score integer;
begin
  select rooms.competition_id into cid from arena.rounds join arena.rooms on rooms.id=rounds.room_id where rounds.id=p_round_id;
  if cid is null then
    return arena.process_workshop_submission(p_round_id,p_team_id,p_token_hash,p_game,p_item_id,p_idempotency_key,p_payload,p_successful,p_score,p_content_version,p_config);
  end if;
  select * into c from arena.competitions where id=cid for share;
  select * into stage from arena.competition_stages where competition_id=cid and round_id=p_round_id for share;
  if not found or c.expires_at<=clock_timestamp() or stage.status<>'active' or stage.deadline_at<=clock_timestamp() or c.status not in ('STAGE_1_ACTIVE','STAGE_2_ACTIVE') then raise exception 'stage_closed'; end if;
  select rounds.room_id into room_id from arena.rounds where id = p_round_id;
  select * into r from arena.rooms where id = room_id for share;
  if not found then raise exception 'round_not_running'; end if;
  select * into rd from arena.rounds where id = p_round_id for share;
  select * into t from arena.teams where id = p_team_id and teams.room_id = r.id for update;
  if not found or p_token_hash is null or t.join_token_hash <> p_token_hash
     or t.token_revoked_at is not null or t.token_expires_at <= clock_timestamp() then
    raise exception 'forbidden';
  end if;
  if t.competition_team_id is null or not exists(select 1 from arena.competition_teams where id=t.competition_team_id and competition_id=cid) then raise exception 'forbidden'; end if;
  if stage.deadline_at<=clock_timestamp() then raise exception 'stage_closed'; end if;
  if r.expires_at <= clock_timestamp() or r.status <> 'running'
     or rd.status <> 'running' or rd.game <> p_game then
    raise exception 'round_not_running';
  end if;
  if rd.content_version is distinct from p_content_version or rd.config is distinct from p_config then
    raise exception 'round_content_mismatch';
  end if;
  if not coalesce((case when p_game = 'accessibility' then rd.config->'scenarioIds'
               when p_game = 'robot' then rd.config->'levelIds' end ? p_item_id),false) then
    raise exception 'item_not_in_round';
  end if;
  if p_game not in ('accessibility','robot') or p_item_id is null
     or p_idempotency_key is null or length(p_idempotency_key) not between 1 and 200
     or p_payload is null or jsonb_typeof(p_payload) <> 'object'
     or p_successful is null or p_score is null or p_score < 0
     or (p_game = 'accessibility' and (not p_successful or p_score not in (0,50,100)))
     or (p_game = 'robot' and ((not p_successful and p_score <> 0)
        or (p_successful and p_score not between 60 and 100))) then
    raise exception 'invalid_verified_submission';
  end if;
  select * into previous_attempt from arena.submission_attempts
    where round_id = p_round_id and team_id = p_team_id and idempotency_key = p_idempotency_key;
  if found then
    if previous_attempt.item_id <> p_item_id or previous_attempt.payload <> p_payload then
      raise exception 'invalid_idempotency_reuse';
    end if;
    return previous_attempt.response || jsonb_build_object('duplicate',true);
  end if;
  insert into arena.submission_attempts(round_id,team_id,item_id,idempotency_key,payload,successful,calculated_score)
    values(p_round_id,p_team_id,p_item_id,p_idempotency_key,p_payload,p_successful,p_score);
  select verified_score into previous_score from arena.submissions
    where round_id=p_round_id and team_id=p_team_id and item_id=p_item_id;
  if p_successful then
    insert into arena.submissions(round_id,team_id,item_id,idempotency_key,payload,verified_score,verified)
      values(p_round_id,p_team_id,p_item_id,p_idempotency_key,p_payload,p_score,true)
    on conflict(round_id,team_id,item_id) do update set
      verified_score = case when p_game='robot' then greatest(arena.submissions.verified_score,excluded.verified_score) else arena.submissions.verified_score end,
      payload = case when p_game='robot' and excluded.verified_score > arena.submissions.verified_score then excluded.payload else arena.submissions.payload end,
      idempotency_key = case when p_game='robot' and excluded.verified_score > arena.submissions.verified_score then excluded.idempotency_key else arena.submissions.idempotency_key end
    returning * into scored;
  end if;
  select score into total from arena.team_scores where round_id=p_round_id and team_id=p_team_id;
  result := jsonb_build_object('verified',p_successful,'score',coalesce(total,0),
    'duplicate',p_game='accessibility' and previous_score is not null,
    'improved',p_successful and (previous_score is null or scored.verified_score > previous_score),
    'submission',case when p_successful then jsonb_build_object('id',scored.id,'verified_score',scored.verified_score) else null end);
  if p_game='accessibility' then
    result:=jsonb_build_object('accepted',true,'duplicate',p_game='accessibility' and previous_score is not null);
  end if;
  update arena.submission_attempts set response=result
    where round_id=p_round_id and team_id=p_team_id and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create function arena.submit_competition_tie(p_id uuid,p_team uuid,p_hash text,p_answer text,p_score integer,p_attempt integer) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare c arena.competitions; t arena.teams; previous text; rid uuid;
begin
 select * into c from arena.competitions where id=p_id for share;
 select room_id into rid from arena.competition_stages where competition_id=p_id and stage_no=2;
 perform 1 from arena.rooms where id=rid for share;
 select * into t from arena.teams where id=p_team and room_id=rid for update;
 if not found or p_hash is null or t.join_token_hash<>p_hash or t.token_revoked_at is not null or t.token_expires_at<=clock_timestamp() or c.expires_at<=clock_timestamp() then raise exception 'forbidden'; end if;
 if c.status<>'STAGE_2_FINALIZED' or not c.tie_active or c.tie_index<>p_attempt or c.tie_deadline_at<=clock_timestamp() or not(t.competition_team_id=any(c.tie_candidates)) then raise exception 'stage_closed'; end if;
 if p_score not in (0,50,100) or p_score is null or p_answer is null then raise exception 'invalid_answer'; end if;
 select answer_id into previous from arena.competition_tie_answers where competition_id=p_id and attempt=p_attempt and competition_team_id=t.competition_team_id;
 if found then return jsonb_build_object('accepted',true,'duplicate',true); end if;
 insert into arena.competition_tie_answers values(p_id,p_attempt,t.competition_team_id,p_answer,p_score);
 return jsonb_build_object('accepted',true,'duplicate',false);
end $$;

create function arena.competition_state(p_id uuid,p_role text,p_hash text,p_team uuid default null) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare c arena.competitions; t arena.teams; result jsonb; stages jsonb; own jsonb; teams jsonb;
begin
 select * into c from arena.competitions where id=p_id for share;
 if not found or c.expires_at<=clock_timestamp() or p_hash is null then raise exception 'forbidden'; end if;
 if p_role='mc' then
  if c.mc_token_hash<>p_hash or c.mc_revoked_at is not null then raise exception 'forbidden'; end if;
 elsif p_role='presentation' then
  if c.presentation_hash is null or c.presentation_hash<>p_hash or c.presentation_revoked_at is not null or c.presentation_expires_at<=clock_timestamp() then raise exception 'forbidden'; end if;
 elsif p_role='team' then
  select tm.* into t from arena.teams tm join arena.rooms r on r.id=tm.room_id where tm.id=p_team and r.competition_id=c.id for share of tm;
  if not found or t.join_token_hash<>p_hash or t.token_revoked_at is not null or t.token_expires_at<=clock_timestamp() then raise exception 'forbidden'; end if;
 else raise exception 'forbidden'; end if;
 -- Configs contain public prompts/maps only, never answer keys or BFS sequences.
 select coalesce(jsonb_agg(jsonb_build_object('stageNo',s.stage_no,'status',s.status,'roundId',s.round_id,'startedAt',s.started_at,'deadlineAt',s.deadline_at,'activeIndex',s.active_index,'roomCode',case when p_role<>'presentation' then r.code else null end,'config',s.config,'contentVersion',s.content_version) order by s.stage_no),'[]') into stages from arena.competition_stages s join arena.rooms r on r.id=s.room_id where s.competition_id=c.id;
 result:=jsonb_build_object('mode','competition','role',p_role,'serverNow',clock_timestamp(),'competition',jsonb_build_object('id',c.id,'name',c.name,'status',c.status,'expiresAt',c.expires_at,'winnerTeamId',c.winner_team_id),'stages',stages);
 if p_role='presentation' then
  -- Spectators receive ONLY the selected prompt, not the entire stage library/roster.
  result:=result || jsonb_build_object('stages',(select coalesce(jsonb_agg(jsonb_build_object('stageNo',s.stage_no,'status',s.status,'startedAt',s.started_at,'deadlineAt',s.deadline_at,'activeIndex',s.active_index,'challenge',case when s.status='active' then case when s.stage_no=1 then s.config->'questions'->s.active_index else s.config->'maps'->s.active_index end else null end) order by s.stage_no),'[]') from arena.competition_stages s where s.competition_id=c.id));
  return result;
 end if;
 result:=result || jsonb_build_object('leaderboard',arena.competition_leaderboard(c.id),'tie',jsonb_build_object('active',c.tie_active,'attempt',c.tie_index,'deadlineAt',c.tie_deadline_at,'candidates',c.tie_candidates));
 if p_role='mc' then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by created_at,id),'[]') into teams from arena.competition_teams where competition_id=c.id;
  result:=result || jsonb_build_object('teams',teams,'recoveryRequests',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'teamId',competition_team_id,'expiresAt',expires_at)),'[]') from arena.competition_recovery_requests where competition_id=c.id and not approved and expires_at>clock_timestamp()),'presentationEnabled',c.presentation_hash is not null and c.presentation_revoked_at is null and c.presentation_expires_at>clock_timestamp());
 else
  select jsonb_build_object('teamId',t.id,'competitionTeamId',t.competition_team_id,'name',t.name,
    'submissions',coalesce((select jsonb_agg(jsonb_build_object('itemId',sub.item_id,'answerId',sub.payload->>'answerId','score',case when s.stage_no=2 or s.status='finalized' then sub.verified_score else null end)) from arena.submissions sub join arena.competition_stages s on s.round_id=sub.round_id where sub.team_id=t.id and sub.verified),'[]'),
    'tieSubmitted',exists(select 1 from arena.competition_tie_answers where competition_id=c.id and attempt=c.tie_index and competition_team_id=t.competition_team_id)) into own;
  result:=result||jsonb_build_object('own',own);
 end if;
 return result;
end $$;

create function arena.freeze_competition_stage() returns trigger language plpgsql security invoker set search_path=pg_catalog as $$
begin
 if old.status<>'pending' and (new.config is distinct from old.config or new.content_version<>old.content_version or new.round_id is distinct from old.round_id or new.started_at is distinct from old.started_at or new.deadline_at is distinct from old.deadline_at) then raise exception 'configuration_frozen'; end if;
 if old.status='finalized' and new.status<>'finalized' then raise exception 'stage_closed'; end if;
 return new;
end $$;
create trigger freeze_competition_stage before update on arena.competition_stages for each row execute function arena.freeze_competition_stage();

-- Guard the legacy RPCs: competition transitions must use competition_control.
alter function arena.start_round(uuid,text,jsonb,text,text) rename to start_workshop_round;
create function arena.start_round(p_room_id uuid,p_game text,p_config jsonb,p_content_version text,p_mc_token_hash text) returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
begin
 if exists(select 1 from arena.rooms where id=p_room_id and competition_id is not null) then raise exception 'competition_control_required'; end if;
 return arena.start_workshop_round(p_room_id,p_game,p_config,p_content_version,p_mc_token_hash);
end $$;
alter function arena.apply_room_action(uuid,text,uuid,text) rename to apply_workshop_room_action;
create function arena.apply_room_action(p_room_id uuid,p_action text,p_team_id uuid,p_mc_token_hash text) returns text language plpgsql security invoker set search_path=pg_catalog as $$
begin
 if exists(select 1 from arena.rooms where id=p_room_id and competition_id is not null) then raise exception 'competition_control_required'; end if;
 return arena.apply_workshop_room_action(p_room_id,p_action,p_team_id,p_mc_token_hash);
end $$;

create function arena.protect_competition_scores() returns trigger language plpgsql security invoker set search_path=pg_catalog as $$
declare rid uuid;
begin
 rid:=case when TG_OP='DELETE' then old.round_id else new.round_id end;
 if exists(select 1 from arena.competition_stages where round_id=rid and status='finalized') then raise exception 'stage_closed'; end if;
 if TG_OP='DELETE' then return old; end if;
 return new;
end $$;
create trigger protect_competition_scores before insert or update or delete on arena.submissions for each row execute function arena.protect_competition_scores();

create function arena.immutable_competition_result() returns trigger language plpgsql security invoker set search_path=pg_catalog as $$
begin raise exception 'finalized_result_immutable'; end $$;
create trigger immutable_competition_result before update or delete on arena.competition_results for each row execute function arena.immutable_competition_result();
revoke all on function arena.immutable_competition_result() from public,anon,authenticated;

alter table arena.competitions enable row level security;
alter table arena.competition_teams enable row level security;
alter table arena.competition_stages enable row level security;
alter table arena.competition_results enable row level security;
alter table arena.competition_recovery_requests enable row level security;
alter table arena.competition_tie_answers enable row level security;
revoke all on arena.competitions,arena.competition_teams,arena.competition_stages,arena.competition_results,arena.competition_recovery_requests,arena.competition_tie_answers from public,anon,authenticated;
grant select,insert,update on arena.competitions,arena.competition_teams,arena.competition_stages,arena.competition_results,arena.competition_recovery_requests,arena.competition_tie_answers to service_role;
-- PostgreSQL defaults grant EXECUTE to PUBLIC: explicitly close every new function.
revoke all on function arena.competition_admin(uuid,text),arena.create_competition(text,text,text,text,jsonb,jsonb),arena.join_competition(text,text,text,text),arena.competition_leaderboard(uuid),arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text),arena.request_competition_recovery(uuid,uuid,text),arena.submit_competition_tie(uuid,uuid,text,text,integer,integer),arena.competition_state(uuid,text,text,uuid),arena.freeze_competition_stage(),arena.protect_competition_scores(),arena.process_submission(uuid,uuid,text,text,text,text,jsonb,boolean,integer,text,jsonb),arena.start_round(uuid,text,jsonb,text,text),arena.apply_room_action(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function arena.competition_admin(uuid,text),arena.create_competition(text,text,text,text,jsonb,jsonb),arena.join_competition(text,text,text,text),arena.competition_leaderboard(uuid),arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text),arena.request_competition_recovery(uuid,uuid,text),arena.submit_competition_tie(uuid,uuid,text,text,integer,integer),arena.competition_state(uuid,text,text,uuid),arena.process_submission(uuid,uuid,text,text,text,text,jsonb,boolean,integer,text,jsonb),arena.start_round(uuid,text,jsonb,text,text),arena.apply_room_action(uuid,text,uuid,text) to service_role;
commit;
