-- Cross-device MC display synchronization. Apply AFTER the deployed V3 hotfix.
-- No content/scoring changes, no public/Auth objects. Existing RPC bodies and ACLs
-- are retained under internal names so this patch works with the reviewed 4/3 bank.
begin;
alter table arena.competitions
 add column a11y_view_mode text not null default 'before' check (a11y_view_mode in ('before','after')),
 add column a11y_view_scope text;

create function arena.a11y_display_scope(p_id uuid) returns text
language sql stable security invoker set search_path=pg_catalog as $$
 select case when c.demo_stage=1 then 'demo:1'
 else (select 'stage:'||s.stage_no||':'||s.active_index||':'||s.round_id
       from arena.competition_stages s where s.competition_id=c.id
        and s.stage_no=1 and s.status in ('active','finalized')) end
 from arena.competitions c where c.id=p_id
$$;

alter function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text) rename to competition_control_without_display;
create function arena.competition_control(p_id uuid,p_hash text,p_action text,p_stage integer default null,p_config jsonb default null,p_index integer default null,p_request uuid default null,p_presentation_hash text default null) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare c arena.competitions; scope text; result jsonb;
begin
 if p_action='set_a11y_view' then
  -- Same competition UPDATE lock as lifecycle/revocation, before any stage access.
  -- The expected scope prevents a delayed click applying to the next question.
  c:=arena.competition_admin(p_id,p_hash);
  scope:=arena.a11y_display_scope(p_id);
  if scope is null or p_config->>'viewScope' is distinct from scope
   or p_config->>'viewMode' is null or p_config->>'viewMode' not in ('before','after') then
   raise exception 'invalid_transition';
  end if;
  if p_config->>'viewMode'='after' and c.demo_stage is distinct from 1 and not exists(
   select 1 from arena.competition_stages s where s.competition_id=p_id and s.stage_no=1
    and (s.item_finalized_at is not null or s.status='finalized')) then
   raise exception 'inactive_challenge';
  end if;
  update arena.competitions set a11y_view_mode=p_config->>'viewMode',a11y_view_scope=scope where id=p_id;
  return jsonb_build_object('ok',true);
 end if;
 result:=arena.competition_control_without_display(p_id,p_hash,p_action,p_stage,p_config,p_index,p_request,p_presentation_hash);
 if p_action in ('show_demo','start_stage','advance_challenge') then
  update arena.competitions set a11y_view_mode='before',a11y_view_scope=null where id=p_id;
 end if;
 return result;
end $$;

alter function arena.competition_state(uuid,text,text,uuid) rename to competition_state_without_display;
create function arena.competition_state(p_id uuid,p_role text,p_hash text,p_team uuid default null) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare result jsonb; c arena.competitions; scope text;
begin
 -- Original RPC authorizes all three roles and holds the competition SHARE lock.
 result:=arena.competition_state_without_display(p_id,p_role,p_hash,p_team);
 select * into c from arena.competitions where id=p_id;
 scope:=arena.a11y_display_scope(p_id);
 return result||jsonb_build_object('a11yViewScope',scope,'a11yViewMode',
  case when scope is not null and scope=c.a11y_view_scope then c.a11y_view_mode else 'before' end);
end $$;
revoke all on function arena.a11y_display_scope(uuid) from public,anon,authenticated;
revoke all on function arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text) from public,anon,authenticated;
revoke all on function arena.competition_state(uuid,text,text,uuid) from public,anon,authenticated;
-- Retained internal RPCs remain unavailable to browser roles as well.
revoke all on function arena.competition_control_without_display(uuid,text,text,integer,jsonb,integer,uuid,text) from public,anon,authenticated;
revoke all on function arena.competition_state_without_display(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function arena.a11y_display_scope(uuid),arena.competition_control(uuid,text,text,integer,jsonb,integer,uuid,text),arena.competition_state(uuid,text,text,uuid) to service_role;
commit;
