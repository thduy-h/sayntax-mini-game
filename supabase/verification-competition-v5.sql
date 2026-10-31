-- Read-only postflight. No credentials or private participant rows are returned.
select column_name from information_schema.columns where table_schema='arena' and table_name='competitions' and column_name in ('rules_version','ceremony_phase','results_published_at','robot_demo');
select p.proname,not p.prosecdef as invoker,p.proconfig=ARRAY['search_path=pg_catalog'] as fixed_search_path,
 not has_function_privilege('anon',p.oid,'execute') as anon_denied,
 not has_function_privilege('authenticated',p.oid,'execute') as authenticated_denied
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and p.proname in
 ('process_submission','competition_control','competition_state','competition_leaderboard','robot_demo_trace','robot_demo_snapshot','robot_level_summary','competition_score_explanation');
select not has_schema_privilege('anon','arena','usage') as anon_schema_denied,not has_schema_privilege('authenticated','arena','usage') as authenticated_schema_denied;
select count(*) as aggregate_mismatches from
 (select round_id,team_id,sum(verified_score) score from arena.submissions where verified group by 1,2) a
 full join arena.team_scores b using(round_id,team_id) where coalesce(a.score,0)<>coalesce(b.score,0);
select count(*) as invalid_optimization_budgets from
 (select a.round_id,a.team_id,a.item_id,count(*) filter(where a.optimization) opts from arena.submission_attempts a join arena.competition_stages s on s.round_id=a.round_id join arena.competitions c on c.id=s.competition_id where c.rules_version='v5' group by 1,2,3) q where opts>2;
select count(*) as inconsistent_publication from arena.competitions where rules_version='v5' and
 ((results_published_at is null and ceremony_phase in ('ranking','winner','explanation','closing')) or
 (results_published_at is not null and (status<>'FINALIZED' or winner_team_id is null)));
select count(*) as missing_rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='arena' and c.relkind='r' and not c.relrowsecurity;
