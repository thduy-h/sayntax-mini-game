-- Metadata only: safe before Arena exists. Never invoke application functions here.
select version, name from supabase_migrations.schema_migrations order by version;
select nspname from pg_namespace where nspname = 'arena';
select table_schema, table_name from information_schema.tables
 where table_schema='arena' or (table_schema='public' and table_name like 'arena%')
 order by table_schema, table_name;
select rolname, rolbypassrls from pg_roles
 where rolname in ('service_role','anon','authenticated') order by rolname;
-- Save these fingerprints before deployment and compare after it. They cover public
-- and non-internal Auth triggers, policies, grants and public function definitions.
select md5(coalesce(string_agg(concat_ws('|', c.relname, c.relkind,
 c.relrowsecurity::text, c.relforcerowsecurity::text, c.relacl::text), E'\n' order by c.relname),'')) as public_relation_security_fingerprint
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public';
select md5(coalesce(string_agg(concat_ws('|',tablename,policyname,roles::text,cmd,qual,with_check), E'\n' order by tablename,policyname),'')) as public_policy_fingerprint
 from pg_policies where schemaname='public';
select md5(coalesce(string_agg(pg_get_functiondef(p.oid), E'\n' order by p.proname,pg_get_function_identity_arguments(p.oid)),'')) as public_function_fingerprint
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f';
select md5(coalesce(string_agg(pg_get_triggerdef(t.oid), E'\n' order by n.nspname,c.relname,t.tgname),'')) as website_trigger_fingerprint
 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
 where n.nspname in ('public','auth') and not t.tgisinternal;
