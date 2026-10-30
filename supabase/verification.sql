-- Run read-only after applying the Arena migration in staging.
select nspname from pg_namespace where nspname = 'arena';
select table_schema, table_name from information_schema.tables where table_schema = 'arena' order by table_name;
select grantee, table_name, privilege_type from information_schema.role_table_grants where table_schema = 'arena' order by grantee, table_name;
select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='arena' and c.relkind='r' order by c.relname;
select count(*) filter (where schemaname='arena') as arena_policies from pg_policies;
select has_schema_privilege('anon','arena','usage') as anon_schema_usage,
       has_schema_privilege('authenticated','arena','usage') as authenticated_schema_usage;
select has_table_privilege('anon','arena.rooms','select,insert,update,delete') as anon_room_access,
       has_table_privilege('authenticated','arena.rooms','select,insert,update,delete') as authenticated_room_access;
select routine_schema, routine_name, grantee, privilege_type from information_schema.role_routine_grants
 where routine_schema='arena' and grantee in ('anon','authenticated','PUBLIC') order by routine_name, grantee;
select to_regclass('public.users') as main_users, to_regclass('public.lesson_v2_progress') as main_progress;
select count(*) as arena_objects_outside_schema from information_schema.tables where table_schema='public' and table_name like 'arena_%';
select current_setting('search_path') as search_path,
       to_regprocedure('gen_random_uuid()') as uuid_function,
       to_regprocedure('extensions.gen_random_uuid()') as extensions_uuid_function;

-- Effective privileges, including inherited/default grants, across ALL Arena tables.
select r.rolname, c.relname,
       has_schema_privilege(r.rolname, n.oid, 'USAGE') as schema_usage,
       has_table_privilege(r.rolname, c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as any_table_access
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 cross join (values ('anon'),('authenticated'),('service_role')) r(rolname)
 where n.nspname='arena' and c.relkind='r' order by r.rolname,c.relname;
select p.proname, pg_get_function_identity_arguments(p.oid) as args,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='arena' order by p.proname;

-- A zero mismatch count is required after rehearsal; queries do not repair scores.
with expected as (
  select round_id, team_id,
    coalesce(sum(verified_score) filter (where verified), 0) as score
  from arena.submissions group by round_id, team_id
)
select count(*) as score_total_mismatches
from expected e full join arena.team_scores s
  on s.round_id=e.round_id and s.team_id=e.team_id
where coalesce(e.score,0) <> coalesce(s.score,0);

-- Atomic release: all routines INVOKER with pg_catalog-only search_path.
select p.proname, p.prosecdef as security_definer, p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='arena' order by p.proname;
-- Must be zero after supported RPC traffic (attempt and response commit together).
select count(*) as incomplete_attempts from arena.submission_attempts where response is null;
-- Old unvalidated best-score write entrypoint must not exist.
select to_regprocedure('arena.upsert_best_robot_submission(uuid,uuid,text,text,jsonb,integer)') as obsolete_rpc;
-- One authoritative score per item, attempts scoped to round/team/idempotency key.
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
from pg_constraint where connamespace='arena'::regnamespace and contype='u' order by 1,2;
