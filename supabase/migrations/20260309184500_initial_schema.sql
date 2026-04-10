create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('student', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'font_scale') then
    create type public.font_scale as enum ('default', 'large', 'x-large');
  end if;

  if not exists (select 1 from pg_type where typname = 'progress_status') then
    create type public.progress_status as enum ('not_started', 'in_progress', 'completed');
  end if;

  if not exists (select 1 from pg_type where typname = 'voice_command_status') then
    create type public.voice_command_status as enum ('success', 'unsupported', 'error');
  end if;

  if not exists (select 1 from pg_type where typname = 'program_run_status') then
    create type public.program_run_status as enum ('success', 'error');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role public.app_role not null default 'student',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update
  set email = excluded.email,
      updated_at = timezone('utc', now());

  return new;
end;
$$;

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null
     and auth.uid() = old.id
     and new.role <> old.role
     and not public.is_admin() then
    raise exception 'Only admins can change roles.';
  end if;

  return new;
end;
$$;

create table if not exists public.student_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  display_name text not null,
  age_range text,
  grade_level text,
  school_name text,
  goals text,
  disability_support_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.accessibility_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  font_scale public.font_scale not null default 'default',
  high_contrast boolean not null default false,
  reduced_motion boolean not null default false,
  audio_instructions boolean not null default true,
  large_touch_targets boolean not null default true,
  keyboard_navigation_hints boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  audience text not null,
  estimated_minutes integer not null default 0 check (estimated_minutes >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null unique,
  title text not null,
  summary text not null,
  description text not null,
  order_index integer not null check (order_index > 0),
  estimated_minutes integer not null default 0 check (estimated_minutes >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (course_id, order_index)
);

create table if not exists public.lesson_steps (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  title text not null,
  order_index integer not null check (order_index > 0),
  instructions text not null,
  hints text[] not null default '{}',
  expected_result jsonb not null default '{}'::jsonb,
  completion_logic jsonb not null default '{}'::jsonb,
  starter_workspace jsonb not null default '{"version":1,"blocks":[]}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (lesson_id, order_index)
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  lesson_step_id uuid not null references public.lesson_steps (id) on delete cascade,
  workspace_state jsonb not null default '{"version":1,"blocks":[]}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, lesson_step_id)
);

create table if not exists public.program_runs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  lesson_step_id uuid not null references public.lesson_steps (id) on delete cascade,
  status public.program_run_status not null,
  success boolean not null,
  execution_result jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  lesson_step_id uuid not null references public.lesson_steps (id) on delete cascade,
  status public.progress_status not null default 'not_started',
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, lesson_step_id)
);

create table if not exists public.confidence_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  confidence_level integer not null check (confidence_level between 1 and 5),
  comfort_level integer not null check (comfort_level between 1 and 5),
  reflection text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.voice_command_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  lesson_step_id uuid references public.lesson_steps (id) on delete set null,
  transcript text not null,
  normalized_transcript text not null,
  parsed_action jsonb not null default '{}'::jsonb,
  status public.voice_command_status not null,
  failure_reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.role_model_entries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  headline text not null,
  summary text not null,
  story text not null,
  quote text,
  image_path text,
  sort_order integer not null default 1,
  is_published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_users_role on public.users (role);
create index if not exists idx_lessons_course_order on public.lessons (course_id, order_index);
create index if not exists idx_lesson_steps_lesson_order on public.lesson_steps (lesson_id, order_index);
create index if not exists idx_programs_user_lesson on public.programs (user_id, lesson_id);
create index if not exists idx_program_runs_user_created_at on public.program_runs (user_id, created_at desc);
create index if not exists idx_progress_user_lesson on public.progress (user_id, lesson_id);
create index if not exists idx_confidence_checkins_user_created_at on public.confidence_checkins (user_id, created_at desc);
create index if not exists idx_voice_command_logs_user_created_at on public.voice_command_logs (user_id, created_at desc);
create index if not exists idx_role_model_entries_sort_order on public.role_model_entries (sort_order);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists protect_user_roles on public.users;
create trigger protect_user_roles
before update on public.users
for each row
execute function public.prevent_role_escalation();

drop trigger if exists set_student_profiles_updated_at on public.student_profiles;
create trigger set_student_profiles_updated_at
before update on public.student_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_accessibility_settings_updated_at on public.accessibility_settings;
create trigger set_accessibility_settings_updated_at
before update on public.accessibility_settings
for each row
execute function public.set_updated_at();

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
before update on public.courses
for each row
execute function public.set_updated_at();

drop trigger if exists set_lessons_updated_at on public.lessons;
create trigger set_lessons_updated_at
before update on public.lessons
for each row
execute function public.set_updated_at();

drop trigger if exists set_lesson_steps_updated_at on public.lesson_steps;
create trigger set_lesson_steps_updated_at
before update on public.lesson_steps
for each row
execute function public.set_updated_at();

drop trigger if exists set_programs_updated_at on public.programs;
create trigger set_programs_updated_at
before update on public.programs
for each row
execute function public.set_updated_at();

drop trigger if exists set_progress_updated_at on public.progress;
create trigger set_progress_updated_at
before update on public.progress
for each row
execute function public.set_updated_at();

drop trigger if exists set_role_model_entries_updated_at on public.role_model_entries;
create trigger set_role_model_entries_updated_at
before update on public.role_model_entries
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.student_profiles enable row level security;
alter table public.accessibility_settings enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_steps enable row level security;
alter table public.programs enable row level security;
alter table public.program_runs enable row level security;
alter table public.progress enable row level security;
alter table public.confidence_checkins enable row level security;
alter table public.voice_command_logs enable row level security;
alter table public.role_model_entries enable row level security;

create policy users_select_self_or_admin
on public.users
for select
to authenticated
using (auth.uid() = id or public.is_admin());

create policy users_update_self_or_admin
on public.users
for update
to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

create policy student_profiles_select_self_or_admin
on public.student_profiles
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy student_profiles_insert_self
on public.student_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy student_profiles_update_self_or_admin
on public.student_profiles
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy accessibility_settings_select_self_or_admin
on public.accessibility_settings
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy accessibility_settings_insert_self
on public.accessibility_settings
for insert
to authenticated
with check (auth.uid() = user_id);

create policy accessibility_settings_update_self_or_admin
on public.accessibility_settings
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy courses_select_published_or_admin
on public.courses
for select
to authenticated
using (is_published or public.is_admin());

create policy courses_manage_admin
on public.courses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy lessons_select_published_or_admin
on public.lessons
for select
to authenticated
using (
  public.is_admin()
  or (
    is_published
    and exists (
      select 1
      from public.courses
      where id = lessons.course_id
        and is_published
    )
  )
);

create policy lessons_manage_admin
on public.lessons
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy lesson_steps_select_published_or_admin
on public.lesson_steps
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.lessons
    join public.courses on public.courses.id = public.lessons.course_id
    where public.lessons.id = lesson_steps.lesson_id
      and public.lessons.is_published
      and public.courses.is_published
  )
);

create policy lesson_steps_manage_admin
on public.lesson_steps
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy programs_select_self_or_admin
on public.programs
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy programs_insert_self
on public.programs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy programs_update_self_or_admin
on public.programs
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy program_runs_select_self_or_admin
on public.program_runs
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy program_runs_insert_self
on public.program_runs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy progress_select_self_or_admin
on public.progress
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy progress_insert_self
on public.progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy progress_update_self_or_admin
on public.progress
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy confidence_checkins_select_self_or_admin
on public.confidence_checkins
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy confidence_checkins_insert_self
on public.confidence_checkins
for insert
to authenticated
with check (auth.uid() = user_id);

create policy voice_command_logs_select_self_or_admin
on public.voice_command_logs
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy voice_command_logs_insert_self
on public.voice_command_logs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy role_model_entries_select_published_or_admin
on public.role_model_entries
for select
to authenticated
using (is_published or public.is_admin());

create policy role_model_entries_manage_admin
on public.role_model_entries
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
