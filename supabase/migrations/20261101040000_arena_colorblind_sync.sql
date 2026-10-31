-- MC color-vision simulation is shared display state, independent of answer reveal.
begin;
alter table arena.competitions
 add column a11y_colorblind_sim boolean not null default false,
 add column a11y_colorblind_scope text;

alter function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text) rename to competition_control_without_vision;
create function arena.competition_control(p_id uuid,p_hash text,p_action text,p_stage integer default null,p_config jsonb default null,p_index integer default null,p_request uuid default null,p_presentation_hash text default null) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare c arena.competitions; scope text; result jsonb;
begin
 if p_action='set_a11y_vision' then
  c:=arena.competition_admin(p_id,p_hash);
  scope:=arena.a11y_display_scope(p_id);
  if scope is null or p_config->>'viewScope' is distinct from scope
   or jsonb_typeof(p_config->'enabled') is distinct from 'boolean' then raise exception 'invalid_transition'; end if;
  update arena.competitions set a11y_colorblind_sim=(p_config->>'enabled')::boolean,a11y_colorblind_scope=scope where id=p_id;
  return '{"ok":true}'::jsonb;
 end if;
 result:=arena.competition_control_without_vision(p_id,p_hash,p_action,p_stage,p_config,p_index,p_request,p_presentation_hash);
 if p_action in ('show_demo','start_stage','advance_challenge','end_demo') then
  update arena.competitions set a11y_colorblind_sim=false,a11y_colorblind_scope=null where id=p_id;
 end if;
 return result;
end $$;

alter function arena.competition_state(uuid,text,text,uuid) rename to competition_state_without_vision;
create function arena.competition_state(p_id uuid,p_role text,p_hash text,p_team uuid default null) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare result jsonb; c arena.competitions;
begin
 result:=arena.competition_state_without_vision(p_id,p_role,p_hash,p_team);
 select * into c from arena.competitions where id=p_id;
 return result||jsonb_build_object('a11yColorblindSim',coalesce(c.a11y_colorblind_scope=arena.a11y_display_scope(p_id),false) and c.a11y_colorblind_sim);
end $$;
revoke all on function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text),arena.competition_state(uuid,text,text,uuid),arena.competition_control_without_vision(uuid,text,text,integer,jsonb,integer,uuid,text),arena.competition_state_without_vision(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text),arena.competition_state(uuid,text,text,uuid) to service_role;
commit;
