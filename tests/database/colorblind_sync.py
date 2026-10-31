# Real disposable PostgreSQL, after the complete V5 regression suite.
patch=ROOT/'supabase/migrations/20261101040000_arena_colorblind_sync.sql'
rollback=ROOT/'supabase/rollback/20261101040000_arena_colorblind_sync.rollback.sql'
before=fingerprint();migration(patch)
for repeat in range(4):
 c=v5fixture(8);v2control(c,'presentation_rotate',presentation='e'*64);v2control(c,'start_stage',1)
 st=v2state(c);scope=st['a11yViewScope'];cfg={'enabled':True,'viewScope':scope}
 assert st['a11yColorblindSim'] is False
 for h in [c['teams'][0]['hash'],'e'*64,'invalid']:
  v2rpc('competition_control',[c['competitionId'],h,'set_a11y_vision',None,cfg,None,None,None],fail='forbidden')
 v2control(c,'set_a11y_vision',config={'enabled':'true','viewScope':scope},fail='invalid_transition')
 v2control(c,'set_a11y_vision',config=cfg)
 assert all(v2state(c,'team',i)['a11yColorblindSim'] is True for i in range(8))
 assert v2state(c,'presentation',hash='e'*64)['a11yColorblindSim'] is True
 assert v2state(c)['a11yViewMode']=='before' # filter does not reveal answers
 v2control(c,'set_a11y_vision',config={'enabled':False,'viewScope':scope})
 assert v2state(c,'presentation',hash='e'*64)['a11yColorblindSim'] is False
 v3expire(c,1)
 cid=c['competitionId']
 write="select arena.competition_control("+literal(cid)+','+literal(V2_HASH)+",'set_a11y_vision',null,"+literal(json.dumps(cfg))+"::jsonb)"
 advance="select arena.competition_control("+literal(cid)+','+literal(V2_HASH)+",'advance_challenge',1,null,0)"
 if repeat%2==0:overlap(write,advance)
 else:overlap(advance,write,second_error='invalid_transition')
 assert v2state(c)['a11yColorblindSim'] is False
 v2control(c,'set_a11y_vision',config=cfg,fail='invalid_transition')
 invariant()
print('PASS vision4 x8 teams: MC-only bool/scope validation,all roles agree,reconnect reads,no answer reveal,both advance race orders,reset/no score writes')
for role in ['anon','authenticated']:
 assert sql(f"select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and has_function_privilege('{role}',p.oid,'execute')")=='0'
assert sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and (p.prosecdef or p.proconfig is distinct from ARRAY['search_path=pg_catalog'])")=='0'
assert before==fingerprint()
migration(rollback);migration(patch)
assert sql("select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock'")=='0'
print('PASS vision invoker/search paths/grants,website isolation,rollback/reapply,zero unresolved lock waits')
