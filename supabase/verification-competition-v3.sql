-- Read-only checks. No token values or private submissions selected.
begin read only;
select table_name,column_name,data_type from information_schema.columns where table_schema='arena' and column_name in ('demo_stage','item_started_at','item_deadline_at','item_finalized_at') order by table_name,column_name;
select n.nspname,p.proname,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and p.proname in ('competition_control','process_submission','competition_state','join_competition','freeze_competition_stage');
select role,has_schema_privilege(role,'arena','USAGE') as schema_access,
 (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and has_function_privilege(role,p.oid,'EXECUTE')) as executable_rpcs,
 (select count(*) from pg_tables t where t.schemaname='arena' and has_table_privilege(role,t.schemaname||'.'||t.tablename,'SELECT,INSERT,UPDATE,DELETE')) as table_access
from (values('anon'),('authenticated')) r(role);
select count(*) as missing_rls from pg_tables where schemaname='arena' and not rowsecurity;
select count(*) as invalid_active_items from arena.competition_stages where status='active' and (item_started_at is null or item_deadline_at is null or active_index>=case when stage_no=1 then 4 else 3 end);
select count(*) as aggregate_mismatch from arena.team_scores ts where ts.score is distinct from (select coalesce(sum(s.verified_score) filter(where s.verified),0) from arena.submissions s where s.round_id=ts.round_id and s.team_id=ts.team_id);
commit;
