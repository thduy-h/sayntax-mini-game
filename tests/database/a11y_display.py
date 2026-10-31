# Executed only inside the disposable localhost PG17 harness, after V1/V2/V3.
patch=ROOT/'supabase/migrations/20261101020000_arena_a11y_display_sync.sql'
rollback=ROOT/'supabase/rollback/20261101020000_arena_a11y_display_sync.rollback.sql'
before_display=fingerprint()
migration(patch)
for repeat in range(4):
 c=v2fixture(8)
 v2control(c,'presentation_rotate',presentation='e'*64)
 v2control(c,'show_demo',1)
 initial=v2state(c)
 assert initial['a11yViewMode']=='before' and initial['a11yViewScope']=='demo:1'
 cfg={'viewMode':'after','viewScope':initial['a11yViewScope']}
 for h in [c['teams'][0]['hash'],'e'*64,'invalid']:
  v2rpc('competition_control',[c['competitionId'],h,'set_a11y_view',None,cfg,None,None,None],fail='forbidden')
 v2control(c,'set_a11y_view',config=cfg)
 assert all(v2state(c,'team',i)['a11yViewMode']=='after' for i in range(8))
 assert v2state(c,'presentation',hash='e'*64)['a11yViewMode']=='after'
 assert v2state(v2fixture())['a11yViewMode']=='before'
 v2control(c,'start_stage',1)
 st=v2state(c);assert st['a11yViewMode']=='before'
 v2control(c,'set_a11y_view',config=cfg,fail='invalid_transition')
 cfg={'viewMode':'after','viewScope':st['a11yViewScope']}
 v2control(c,'set_a11y_view',config=cfg,fail='inactive_challenge')
 parallel(['set role service_role; '+v2call(c,team=i) for i in range(8)])
 assert [v2total(c,team=i) for i in range(8)]==[100]*8
 v3close(c)
 v2control(c,'set_a11y_view',config=cfg)
 assert all(v2state(c,'team',i)['a11yViewMode']=='after' for i in range(8))
 assert v2state(c,'presentation',hash='e'*64)['a11yViewMode']=='after'
 # Race: old item display request cannot apply to next item in either lock order.
 cid=c['competitionId']
 write="select arena.competition_control("+literal(cid)+','+literal(V2_HASH)+",'set_a11y_view',null,"+literal(json.dumps(cfg))+"::jsonb)"
 advance="select arena.competition_control("+literal(cid)+','+literal(V2_HASH)+",'advance_challenge',1,null,0)"
 if repeat%2==0:overlap(write,advance)
 else:overlap(advance,write,second_error='invalid_transition')
 assert v2state(c)['a11yViewMode']=='before'
 v2control(c,'set_a11y_view',config=cfg,fail='invalid_transition')
 # Existing token expiry/revocation checks apply to display reads and writes too.
 sql("update arena.teams set token_revoked_at=clock_timestamp() where id="+literal(c['teams'][0]['team']['id']))
 v2rpc('competition_state',[cid,'team',c['teams'][0]['hash'],c['teams'][0]['team']['id']],fail='forbidden')
 v2control(c,'presentation_revoke')
 v2rpc('competition_state',[cid,'presentation','e'*64,None],fail='forbidden')
 sql("update arena.competitions set mc_revoked_at=clock_timestamp() where id="+literal(cid))
 v2control(c,'set_a11y_view',config={'viewMode':'before','viewScope':v2stage(c,1)['round_id']},fail='forbidden')
 invariant()
print('PASS display sync: 4 x 8-team runs, demo/closed-item across all roles, scope reset, no premature AFTER, no participant/spectator writes, revoked tokens, both real-connection advance races, canonical totals')
for role in ['anon','authenticated']:
 assert sql(f"select has_schema_privilege('{role}','arena','usage')")=='f'
 assert sql(f"select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and has_function_privilege('{role}',p.oid,'execute')")=='0'
assert sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and (p.prosecdef or p.proconfig is distinct from ARRAY['search_path=pg_catalog'])")=='0'
assert before_display==fingerprint()
assert sql("select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock'")=='0'
migration(rollback)
assert sql("select count(*) from information_schema.columns where table_schema='arena' and column_name='a11y_view_mode'")=='0'
migration(patch)
print('PASS display restricted grants, fixed invoker paths, website isolation, rollback/reapply, no unresolved lock waits')
