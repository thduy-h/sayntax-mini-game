-- SAYNTAX Game Arena shared-project migration.
-- This migration owns only the `arena` schema. It does not alter public website tables.
create schema if not exists arena;

create table if not exists arena.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  mc_token_hash text not null,
  mc_token_expires_at timestamptz not null default timezone('utc', now()) + interval '8 hours',
  mc_token_revoked_at timestamptz,
  status text not null default 'lobby' check (status in ('lobby','locked','running','completed','expired')),
  config jsonb not null default '{}'::jsonb,
  version bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '8 hours'
);

create table if not exists arena.teams (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references arena.rooms(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  join_token_hash text not null,
  token_expires_at timestamptz not null default timezone('utc', now()) + interval '8 hours',
  token_revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique(room_id, name), unique(room_id, id)
);

create table if not exists arena.rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references arena.rooms(id) on delete cascade,
  game text not null check (game in ('accessibility','robot')),
  status text not null default 'ready' check (status in ('ready','running','completed','interrupted')),
  config jsonb not null,
  content_version text not null,
  started_at timestamptz,
  ended_at timestamptz,
  unique(room_id, id)
);

create table if not exists arena.submissions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references arena.rounds(id) on delete cascade,
  team_id uuid not null references arena.teams(id) on delete cascade,
  item_id text not null,
  idempotency_key text not null,
  payload jsonb not null,
  verified_score integer not null default 0 check (verified_score >= 0),
  verified boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique(round_id, team_id, item_id)
);

create table if not exists arena.submission_attempts (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references arena.rounds(id) on delete cascade,
  team_id uuid not null references arena.teams(id) on delete cascade,
  item_id text not null,
  idempotency_key text not null unique,
  successful boolean not null,
  calculated_score integer not null default 0 check (calculated_score >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists arena.team_scores (
  round_id uuid not null references arena.rounds(id) on delete cascade,
  team_id uuid not null references arena.teams(id) on delete cascade,
  score integer not null default 0 check (score >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key(round_id, team_id)
);

create table if not exists arena.rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

create index if not exists arena_rooms_code_idx on arena.rooms(code);
create index if not exists arena_teams_room_idx on arena.teams(room_id);
create index if not exists arena_rounds_room_idx on arena.rounds(room_id);
create unique index if not exists arena_one_running_round_per_room_idx on arena.rounds(room_id) where status = 'running';
create index if not exists arena_submissions_round_team_idx on arena.submissions(round_id, team_id);
create index if not exists arena_attempts_round_team_idx on arena.submission_attempts(round_id, team_id);

create or replace function arena.enforce_team_limit()
returns trigger language plpgsql set search_path = arena, public as $$
declare current_status text;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.room_id::text, 0));
  select status into current_status from arena.rooms
    where id = new.room_id and expires_at > timezone('utc', now()) for update;
  if current_status is distinct from 'lobby' then raise exception 'room_not_joinable'; end if;
  if (select count(*) from arena.teams where room_id = new.room_id) >= 8 then
    raise exception 'room_team_limit_reached';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_team_limit on arena.teams;
create trigger enforce_team_limit before insert on arena.teams
for each row execute function arena.enforce_team_limit();

create or replace function arena.refresh_team_score()
returns trigger language plpgsql set search_path = arena, public as $$
begin
  insert into arena.team_scores(round_id, team_id, score, updated_at)
  select new.round_id, new.team_id, coalesce(sum(verified_score), 0), timezone('utc', now())
    from arena.submissions where round_id = new.round_id and team_id = new.team_id and verified
  on conflict (round_id, team_id) do update
    set score = excluded.score, updated_at = excluded.updated_at;
  return new;
end;
$$;
drop trigger if exists refresh_team_score on arena.submissions;
create trigger refresh_team_score after insert or update of verified_score, verified on arena.submissions
for each row execute function arena.refresh_team_score();

create or replace function arena.prevent_running_round_changes()
returns trigger language plpgsql set search_path = arena, public as $$
begin
  if old.status = 'running' and (new.config is distinct from old.config or new.content_version is distinct from old.content_version or new.game is distinct from old.game) then
    raise exception 'active_round_configuration_is_immutable';
  end if;
  return new;
end;
$$;
drop trigger if exists prevent_running_round_changes on arena.rounds;
create trigger prevent_running_round_changes before update on arena.rounds
for each row execute function arena.prevent_running_round_changes();

create or replace function arena.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = arena, public as $$
declare current_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then return false; end if;
  insert into arena.rate_limits(key, window_started_at, request_count)
    values (p_key, timezone('utc', now()), 1)
  on conflict (key) do update set
    window_started_at = case when arena.rate_limits.window_started_at <= timezone('utc', now()) - make_interval(secs => p_window_seconds) then timezone('utc', now()) else arena.rate_limits.window_started_at end,
    request_count = case when arena.rate_limits.window_started_at <= timezone('utc', now()) - make_interval(secs => p_window_seconds) then 1 else arena.rate_limits.request_count + 1 end
  returning request_count into current_count;
  return current_count <= p_limit;
end;
$$;

create or replace function arena.upsert_best_robot_submission(
  p_round_id uuid, p_team_id uuid, p_item_id text, p_idempotency_key text,
  p_payload jsonb, p_score integer
) returns integer language plpgsql security definer set search_path = arena, public as $$
declare total_score integer;
begin
  insert into arena.submissions(round_id, team_id, item_id, idempotency_key, payload, verified_score, verified)
    values(p_round_id, p_team_id, p_item_id, p_idempotency_key, p_payload, p_score, true)
  on conflict(round_id, team_id, item_id) do update set
    idempotency_key = case when excluded.verified_score > arena.submissions.verified_score then excluded.idempotency_key else arena.submissions.idempotency_key end,
    payload = case when excluded.verified_score > arena.submissions.verified_score then excluded.payload else arena.submissions.payload end,
    verified_score = greatest(arena.submissions.verified_score, excluded.verified_score),
    verified = true;
  select score into total_score from arena.team_scores where round_id = p_round_id and team_id = p_team_id;
  return coalesce(total_score, 0);
end;
$$;

create or replace function arena.start_round(
  p_room_id uuid, p_game text, p_config jsonb, p_content_version text
) returns jsonb language plpgsql security definer set search_path = arena, public as $$
declare selected_room arena.rooms%rowtype;
declare created_round arena.rounds%rowtype;
begin
  select * into selected_room from arena.rooms where id = p_room_id for update;
  if not found or selected_room.expires_at <= timezone('utc', now()) then
    raise exception 'room_not_found';
  end if;
  if selected_room.status <> 'locked' then raise exception 'room_not_locked'; end if;
  if exists (select 1 from arena.rounds where room_id = p_room_id and status = 'running') then
    raise exception 'round_already_running';
  end if;

  insert into arena.rounds(room_id, game, status, config, content_version, started_at)
    values (p_room_id, p_game, 'running', p_config, p_content_version, timezone('utc', now()))
    returning * into created_round;
  update arena.rooms set
    status = 'running',
    config = coalesce(config, '{}'::jsonb) || jsonb_build_object('game', p_game, 'roundId', created_round.id),
    version = version + 1
    where id = p_room_id;

  return jsonb_build_object(
    'id', created_round.id,
    'game', created_round.game,
    'status', created_round.status,
    'config', created_round.config,
    'content_version', created_round.content_version
  );
end;
$$;

create or replace function arena.apply_room_action(
  p_room_id uuid, p_action text, p_team_id uuid default null
) returns text language plpgsql security definer set search_path = arena, public as $$
declare selected_room arena.rooms%rowtype;
declare next_status text;
begin
  select * into selected_room from arena.rooms where id = p_room_id for update;
  if not found or selected_room.expires_at <= timezone('utc', now()) then
    raise exception 'room_not_found';
  end if;

  if p_action = 'lock' then
    if selected_room.status <> 'lobby' then raise exception 'invalid_room_transition'; end if;
    next_status := 'locked';
    update arena.rooms set status = next_status, version = version + 1 where id = p_room_id;
  elsif p_action = 'reopen' then
    if selected_room.status <> 'locked' then raise exception 'invalid_room_transition'; end if;
    next_status := 'lobby';
    update arena.rooms set status = next_status, version = version + 1 where id = p_room_id;
  elsif p_action = 'end_round' then
    if selected_room.status <> 'running' then raise exception 'invalid_room_transition'; end if;
    update arena.rounds set status = 'completed', ended_at = timezone('utc', now())
      where room_id = p_room_id and status = 'running';
    next_status := 'locked';
    update arena.rooms set status = next_status, version = version + 1 where id = p_room_id;
  elsif p_action = 'revoke_team' then
    if p_team_id is null then raise exception 'team_id_required'; end if;
    update arena.teams set token_revoked_at = timezone('utc', now())
      where id = p_team_id and room_id = p_room_id;
    if not found then raise exception 'team_not_found'; end if;
    next_status := selected_room.status;
  elsif p_action = 'end' then
    update arena.rounds set status = 'completed', ended_at = timezone('utc', now())
      where room_id = p_room_id and status = 'running';
    update arena.teams set token_revoked_at = timezone('utc', now()) where room_id = p_room_id;
    next_status := 'completed';
    update arena.rooms set status = next_status, mc_token_revoked_at = timezone('utc', now()), version = version + 1
      where id = p_room_id;
  else
    raise exception 'invalid_action';
  end if;
  return next_status;
end;
$$;

alter table arena.rooms enable row level security;
alter table arena.teams enable row level security;
alter table arena.rounds enable row level security;
alter table arena.submissions enable row level security;
alter table arena.submission_attempts enable row level security;
alter table arena.team_scores enable row level security;
alter table arena.rate_limits enable row level security;

-- All browser writes and reads go through Edge Functions; workshop state uses polling.
revoke all on schema arena from public, anon, authenticated;
revoke all on all tables in schema arena from public, anon, authenticated;
revoke all on all sequences in schema arena from public, anon, authenticated;
revoke all on all functions in schema arena from public, anon, authenticated;
grant usage on schema arena to service_role;
grant all on all tables in schema arena to service_role;
grant all on all sequences in schema arena to service_role;

create or replace function arena.expire_room_if_needed(p_room_id uuid)
returns void language sql security definer set search_path = arena, public as $$
  update arena.rooms set status = 'expired' where id = p_room_id and expires_at <= timezone('utc', now()) and status <> 'expired';
$$;
revoke all on function arena.expire_room_if_needed(uuid) from public, anon, authenticated;
grant execute on function arena.expire_room_if_needed(uuid) to service_role;
revoke all on function arena.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function arena.consume_rate_limit(text, integer, integer) to service_role;
revoke all on function arena.upsert_best_robot_submission(uuid, uuid, text, text, jsonb, integer) from public, anon, authenticated;
grant execute on function arena.upsert_best_robot_submission(uuid, uuid, text, text, jsonb, integer) to service_role;
revoke all on function arena.start_round(uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function arena.start_round(uuid, text, jsonb, text) to service_role;
revoke all on function arena.apply_room_action(uuid, text, uuid) from public, anon, authenticated;
grant execute on function arena.apply_room_action(uuid, text, uuid) to service_role;

-- Browser clients use Edge Function polling and have no direct table privileges. Realtime
-- publication remains disabled unless a future private-channel design is verified separately.
