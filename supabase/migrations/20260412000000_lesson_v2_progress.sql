-- Lesson V2 progress tracking.
--
-- Decoupled from the V1 `progress` table because V1's `lesson_step_id`
-- carries a FK to `public.lesson_steps (id)` — V2 step IDs don't exist in
-- that table (V2 is seeded in TypeScript code only), so we'd either have to
-- backfill lesson_steps rows or drop the FK. A dedicated table keeps the
-- old schema untouched and lets V2 progress live as (lesson_slug, step_id)
-- text pairs that match the in-code seed.
--
-- Reuses the existing `public.progress_status` enum, `set_updated_at()`
-- trigger function, and `is_admin()` helper from the initial schema.

create table if not exists public.lesson_v2_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  lesson_slug text not null,
  step_id text not null,
  status public.progress_status not null default 'completed',
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, lesson_slug, step_id)
);

create index if not exists idx_lesson_v2_progress_user_slug
  on public.lesson_v2_progress (user_id, lesson_slug);

alter table public.lesson_v2_progress enable row level security;

drop policy if exists lesson_v2_progress_select_self_or_admin on public.lesson_v2_progress;
create policy lesson_v2_progress_select_self_or_admin
on public.lesson_v2_progress
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists lesson_v2_progress_insert_self on public.lesson_v2_progress;
create policy lesson_v2_progress_insert_self
on public.lesson_v2_progress
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists lesson_v2_progress_update_self_or_admin on public.lesson_v2_progress;
create policy lesson_v2_progress_update_self_or_admin
on public.lesson_v2_progress
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop trigger if exists set_lesson_v2_progress_updated_at on public.lesson_v2_progress;
create trigger set_lesson_v2_progress_updated_at
before update on public.lesson_v2_progress
for each row
execute function public.set_updated_at();
