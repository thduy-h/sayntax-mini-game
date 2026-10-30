-- DESTRUCTIVE V2 rollback, never automatic. Export a full DB backup and Arena
-- archive first; confirm restore in a disposable database. No website DDL.
-- Operator must explicitly SET arena.confirm_v2_rollback='reviewed-backup';
begin;
do $$ begin
 if current_setting('arena.confirm_v2_rollback',true) is distinct from 'reviewed-backup' then
  raise exception 'V2 rollback requires reviewed backup and explicit operator confirmation';
 end if;
end $$;
create temporary table arena_v2_rollback_rooms on commit drop as select id from arena.rooms where competition_id is not null;
drop trigger protect_competition_scores on arena.submissions;
drop trigger freeze_competition_stage on arena.competition_stages;
drop trigger immutable_competition_result on arena.competition_results;
drop function arena.protect_competition_scores();
drop function arena.freeze_competition_stage();
drop function arena.immutable_competition_result();
drop function arena.process_submission(uuid,uuid,text,text,text,text,jsonb,boolean,integer,text,jsonb);
alter function arena.process_workshop_submission(uuid,uuid,text,text,text,text,jsonb,boolean,integer,text,jsonb) rename to process_submission;
drop function arena.start_round(uuid,text,jsonb,text,text);
alter function arena.start_workshop_round(uuid,text,jsonb,text,text) rename to start_round;
drop function arena.apply_room_action(uuid,text,uuid,text);
alter function arena.apply_workshop_room_action(uuid,text,uuid,text) rename to apply_room_action;
drop function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text);
drop function arena.create_competition(text,text,text,text,jsonb,jsonb);
drop function arena.join_competition(text,text,text,text);
drop function arena.request_competition_recovery(uuid,uuid,text);
drop function arena.submit_competition_tie(uuid,uuid,text,text,integer,integer);
drop function arena.competition_state(uuid,text,text,uuid);
drop function arena.competition_leaderboard(uuid);
drop function arena.competition_admin(uuid,text);
alter table arena.competitions drop constraint arena_competition_winner_fk;
drop table arena.competition_results;
drop table arena.competition_recovery_requests;
drop table arena.competition_tie_answers;
drop table arena.competition_stages;
alter table arena.teams drop column competition_team_id;
drop table arena.competition_teams;
delete from arena.submissions where round_id in (select id from arena.rounds where room_id in (select id from arena_v2_rollback_rooms));
delete from arena.submission_attempts where round_id in (select id from arena.rounds where room_id in (select id from arena_v2_rollback_rooms));
delete from arena.team_scores where round_id in (select id from arena.rounds where room_id in (select id from arena_v2_rollback_rooms));
delete from arena.rounds where room_id in (select id from arena_v2_rollback_rooms);
delete from arena.teams where room_id in (select id from arena_v2_rollback_rooms);
delete from arena.rooms where id in (select id from arena_v2_rollback_rooms);
alter table arena.rooms drop column competition_id;
drop table arena.competitions;
commit;
