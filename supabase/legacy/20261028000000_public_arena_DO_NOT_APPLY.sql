-- SAYNTAX Game Arena workshop schema.
-- Scores are accepted only by the score_submit Edge Function; clients can read the board.
create extension if not exists pgcrypto;

create table if not exists public.arena_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  host_token_hash text not null,
  status text not null default 'lobby' check (status in ('lobby', 'running', 'closed')),
  game_id text check (game_id in ('accessibility', 'robot')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '8 hours'
);

create table if not exists public.arena_teams (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.arena_rooms(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 32),
  join_token_hash text not null,
  score integer not null default 0 check (score >= 0),
  joined_at timestamptz not null default now(),
  unique (room_id, name)
);

create table if not exists public.arena_submissions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.arena_rooms(id) on delete cascade,
  team_id uuid not null references public.arena_teams(id) on delete cascade,
  game_id text not null check (game_id in ('accessibility', 'robot')),
  level_id text not null,
  answer jsonb not null,
  awarded_score integer not null check (awarded_score between 0 and 500),
  created_at timestamptz not null default now()
);

alter table public.arena_rooms enable row level security;
alter table public.arena_teams enable row level security;
alter table public.arena_submissions enable row level security;

create policy "active rooms are readable" on public.arena_rooms for select using (expires_at > now());
create policy "teams are readable in active rooms" on public.arena_teams for select using (exists (select 1 from public.arena_rooms r where r.id = room_id and r.expires_at > now()));
create policy "submissions are never client readable" on public.arena_submissions for select using (false);
-- Insert/update policies are intentionally absent. Edge Functions with the service role
-- validate room/team tokens and recompute awarded_score server-side before writing.

create or replace function public.arena_leaderboard(room_code text)
returns table(team_id uuid, team_name text, score integer)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.score from arena_teams t join arena_rooms r on r.id = t.room_id
  where r.code = upper(room_code) and r.expires_at > now() order by t.score desc, t.joined_at asc;
$$;
