begin;
drop function arena.competition_state(uuid,text,text,uuid);
alter function arena.competition_state_without_vision(uuid,text,text,uuid) rename to competition_state;
drop function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text);
alter function arena.competition_control_without_vision(uuid,text,text,integer,jsonb,integer,uuid,text) rename to competition_control;
alter table arena.competitions drop column a11y_colorblind_sim,drop column a11y_colorblind_scope;
commit;
