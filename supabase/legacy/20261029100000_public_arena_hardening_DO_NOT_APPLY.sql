-- Additive hardening migration. Apply after the base arena migration.
alter table if exists public.arena_submissions add column if not exists idempotency_key text;
alter table if exists public.arena_submissions add column if not exists content_version text;
create unique index if not exists arena_submissions_idempotency_idx on public.arena_submissions(idempotency_key) where idempotency_key is not null;
create table if not exists public.arena_rounds (
  id uuid primary key default gen_random_uuid(), room_id uuid not null references public.arena_rooms(id) on delete cascade,
  game text not null check (game in ('accessibility','robot')), status text not null default 'waiting' check (status in ('waiting','ready','running','completed','interrupted')),
  config jsonb not null default '{}'::jsonb, content_version text not null default '2026-10-29', started_at timestamptz, ended_at timestamptz, created_at timestamptz not null default now()
);
alter table public.arena_rounds enable row level security;
revoke all on public.arena_rounds from anon, authenticated;
-- Writes are intentionally reserved for a server-side Edge Function.

revoke all on function public.arena_leaderboard(text) from public;
grant execute on function public.arena_leaderboard(text) to anon, authenticated;

create or replace function public.arena_team_count_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.arena_teams where room_id = new.room_id) >= 8 then
    raise exception 'room_team_limit_reached';
  end if;
  if exists (select 1 from public.arena_rooms where id = new.room_id and (status <> 'lobby' or expires_at <= now())) then
    raise exception 'room_not_joinable';
  end if;
  return new;
end;
$$;

drop trigger if exists arena_team_count_guard on public.arena_teams;
create trigger arena_team_count_guard before insert on public.arena_teams
for each row execute function public.arena_team_count_guard();
