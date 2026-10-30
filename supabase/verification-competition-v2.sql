-- Read-only post-deployment metadata/invariant checks. No personal row payloads.
begin read only;
select n.nspname,c.relname,c.relrowsecurity,c.relacl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='arena' and c.relkind='r' order by c.relname;
-- Expected no rows: browser grants or unsafe function settings.
select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and (p.prosecdef or p.proconfig is distinct from array['search_path=pg_catalog'] or has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE'));
select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='arena' and c.relkind='r' and (has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE'));
select has_schema_privilege('anon','arena','USAGE') as anon_schema,has_schema_privilege('authenticated','arena','USAGE') as authenticated_schema;
-- Expected no rows: mismatch between canonical submissions and aggregates.
with expected as (select round_id,team_id,sum(verified_score) filter(where verified) score from arena.submissions group by 1,2)
select e.round_id,e.team_id from expected e full join arena.team_scores s using(round_id,team_id) where coalesce(e.score,0)<>coalesce(s.score,0);
-- Expected no rows: inconsistent finalized snapshots or winners.
select competition_id,stage_no from arena.competition_results group by 1,2 having max(raw_score)>case when stage_no=1 then 400 else 300 end;
select id from arena.competitions where status='FINALIZED' and (winner_team_id is null or cardinality(tie_candidates)<>1 or winner_team_id is distinct from tie_candidates[1]);
select competition_id from arena.competition_teams group by 1 having count(*)>8;
-- Expected no rows: finalized snapshots must equal verified canonical records.
with canonical as (
 select st.competition_id,st.stage_no,ct.id competition_team_id,
 coalesce(sum(sub.verified_score) filter(where sub.verified),0) raw_score,
 count(*) filter(where sub.verified and sub.verified_score=100) perfect_count
 from arena.competition_stages st
 join arena.competition_teams ct on ct.competition_id=st.competition_id
 left join arena.teams t on t.competition_team_id=ct.id and t.room_id=st.room_id
 left join arena.submissions sub on sub.team_id=t.id and sub.round_id=st.round_id
 where st.status='finalized' group by st.competition_id,st.stage_no,ct.id
)
select c.competition_id,c.stage_no,c.competition_team_id from canonical c
full join arena.competition_results r using(competition_id,stage_no,competition_team_id)
where c.competition_team_id is null or r.competition_team_id is null
or c.raw_score is distinct from r.raw_score or c.perfect_count is distinct from r.perfect_count;
-- Expected no rows: no room team associated with another competition identity.
select t.id from arena.teams t join arena.rooms r on r.id=t.room_id
left join arena.competition_teams ct on ct.id=t.competition_team_id
where (r.competition_id is not null and ct.competition_id is distinct from r.competition_id)
or (r.competition_id is null and t.competition_team_id is not null);
commit;
