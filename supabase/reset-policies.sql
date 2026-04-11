-- Run this BEFORE re-running `supabase/migrations/20260309184500_initial_schema.sql`
-- if you hit "policy already exists" errors. It drops all 28 policies from
-- the initial schema so the main migration can re-create them cleanly.
-- Safe to run multiple times (all DROPs use IF EXISTS).

drop policy if exists users_select_self_or_admin on public.users;
drop policy if exists users_update_self_or_admin on public.users;
drop policy if exists student_profiles_select_self_or_admin on public.student_profiles;
drop policy if exists student_profiles_insert_self on public.student_profiles;
drop policy if exists student_profiles_update_self_or_admin on public.student_profiles;
drop policy if exists accessibility_settings_select_self_or_admin on public.accessibility_settings;
drop policy if exists accessibility_settings_insert_self on public.accessibility_settings;
drop policy if exists accessibility_settings_update_self_or_admin on public.accessibility_settings;
drop policy if exists courses_select_published_or_admin on public.courses;
drop policy if exists courses_manage_admin on public.courses;
drop policy if exists lessons_select_published_or_admin on public.lessons;
drop policy if exists lessons_manage_admin on public.lessons;
drop policy if exists lesson_steps_select_published_or_admin on public.lesson_steps;
drop policy if exists lesson_steps_manage_admin on public.lesson_steps;
drop policy if exists programs_select_self_or_admin on public.programs;
drop policy if exists programs_insert_self on public.programs;
drop policy if exists programs_update_self_or_admin on public.programs;
drop policy if exists program_runs_select_self_or_admin on public.program_runs;
drop policy if exists program_runs_insert_self on public.program_runs;
drop policy if exists progress_select_self_or_admin on public.progress;
drop policy if exists progress_insert_self on public.progress;
drop policy if exists progress_update_self_or_admin on public.progress;
drop policy if exists confidence_checkins_select_self_or_admin on public.confidence_checkins;
drop policy if exists confidence_checkins_insert_self on public.confidence_checkins;
drop policy if exists voice_command_logs_select_self_or_admin on public.voice_command_logs;
drop policy if exists voice_command_logs_insert_self on public.voice_command_logs;
drop policy if exists role_model_entries_select_published_or_admin on public.role_model_entries;
drop policy if exists role_model_entries_manage_admin on public.role_model_entries;
