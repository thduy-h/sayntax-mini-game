-- Roll back only the cross-device display patch; retain competition/scoring data.
begin;
drop function arena.competition_state(uuid,text,text,uuid);
alter function arena.competition_state_without_display(uuid,text,text,uuid) rename to competition_state;
drop function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text);
alter function arena.competition_control_without_display(uuid,text,text,integer,jsonb,integer,uuid,text) rename to competition_control;
drop function arena.a11y_display_scope(uuid);
alter table arena.competitions drop column a11y_view_mode,drop column a11y_view_scope;
commit;
