-- Safe schema rollback only BEFORE any V5 competition exists.
-- Once used, preserve canonical history and restore reviewed backup/forward-fix.
begin;
do $$ begin
 if exists(select 1 from arena.competitions where rules_version='v5') then raise exception 'V5 rollback blocked: preserve official V5 history; use reviewed restore or forward fix'; end if;
end $$;
drop trigger freeze_competition_rules on arena.competitions;
drop trigger protect_competition_attempts on arena.submission_attempts;
drop function arena.freeze_competition_rules();
drop function arena.competition_state(uuid,text,text,uuid);
alter function arena.competition_state_pre_v5(uuid,text,text,uuid) rename to competition_state;
drop function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text);
alter function arena.competition_control_pre_v5(uuid,text,text,integer,jsonb,integer,uuid,text) rename to competition_control;
drop function arena.competition_control_v5_impl(uuid,text,text,integer,jsonb,integer,uuid,text);
drop function arena.process_submission(uuid,uuid,text,text,text,text,jsonb,boolean,integer,text,jsonb);
alter function arena.process_submission_pre_v5(uuid,uuid,text,text,text,text,jsonb,boolean,integer,text,jsonb) rename to process_submission;
drop function arena.competition_score_explanation(uuid,uuid);
drop function arena.robot_level_summary(uuid,uuid,text,boolean);
drop function arena.robot_demo_snapshot(jsonb);
drop function arena.robot_demo_trace(jsonb);
drop function arena.competition_leaderboard(uuid);
alter function arena.competition_leaderboard_pre_v5(uuid) rename to competition_leaderboard;
drop function arena.create_competition(text,text,text,text,jsonb,jsonb);
alter function arena.create_competition_pre_v5(text,text,text,text,jsonb,jsonb) rename to create_competition;
drop index arena.arena_official_robot_run;
alter table arena.submission_attempts drop column commands_used,drop column optimal_commands,drop column official_run_no,drop column optimization;
alter table arena.competition_results drop column official_runs;
alter table arena.competition_results drop constraint competition_results_raw_score_check;
alter table arena.competition_results add constraint competition_results_raw_score_check check(raw_score>=0 and raw_score<=case when stage_no=1 then 400 else 300 end);
alter table arena.competition_results drop constraint competition_results_perfect_count_check;
alter table arena.competition_results add constraint competition_results_perfect_count_check check(perfect_count between 0 and 4);
alter table arena.competitions drop column rules_version,drop column ceremony_phase,drop column results_published_at,drop column robot_demo;
commit;
