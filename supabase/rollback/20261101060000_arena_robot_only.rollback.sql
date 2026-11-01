-- Only for environments without Robot-only rooms; never discard official data.
begin;
do $$ begin
 if exists(select 1 from arena.competitions where competition_mode='robot_only')
 then raise exception 'robot_only_rooms_exist'; end if;
end $$;
drop function arena.competition_state(uuid,text,text,uuid);
alter function arena.competition_state_before_robot_only(uuid,text,text,uuid) rename to competition_state;
drop function arena.competition_leaderboard(uuid);
alter function arena.competition_leaderboard_before_robot_only(uuid) rename to competition_leaderboard;
drop function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text);
alter function arena.competition_control_before_robot_only(uuid,text,text,integer,jsonb,integer,uuid,text) rename to competition_control;
alter table arena.competitions drop column competition_mode;
commit;
