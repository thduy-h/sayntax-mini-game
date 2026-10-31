-- Read-only postflight; never select credential hashes or team/private row values.
select count(*) = 2 as display_columns_present
from information_schema.columns
where table_schema='arena' and table_name='competitions'
 and column_name in ('a11y_view_mode','a11y_view_scope');
select p.proname,not p.prosecdef as security_invoker,
 p.proconfig=ARRAY['search_path=pg_catalog'] as fixed_search_path,
 has_function_privilege('service_role',p.oid,'execute') as backend_can_execute,
 not has_function_privilege('anon',p.oid,'execute') as anon_denied,
 not has_function_privilege('authenticated',p.oid,'execute') as authenticated_denied
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='arena' and p.proname in
 ('a11y_display_scope','competition_control','competition_state',
 'competition_control_without_display','competition_state_without_display');
select not has_schema_privilege('anon','arena','usage') as anon_schema_denied,
 not has_schema_privilege('authenticated','arena','usage') as authenticated_schema_denied;
