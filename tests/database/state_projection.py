# Runs after existing V1/V2/V3 regression suite in a disposable localhost cluster.
from copy import deepcopy
migration(ROOT/'supabase/migrations/20261031020000_arena_competition_v4.sql')
V2_CONFIG1=deepcopy(V2_CONFIG1)
V2_CONFIG1['scenarioIds']=['contrast','keyboard','captions','language','touch','color']
V2_CONFIG1['questions']=[dict(V2_CONFIG1['questions'][0],id=x) for x in V2_CONFIG1['scenarioIds']]
V2_CONFIG2=deepcopy(V2_CONFIG2)
V2_CONFIG2['levelIds']=['1','2','6','4']
V2_CONFIG2['maps']=[dict(V2_CONFIG2['maps'][0],id=x) for x in V2_CONFIG2['levelIds']]
c=v2fixture(2)
v2control(c,'presentation_rotate',presentation='e'*64)
migration(ROOT/'supabase/migrations/20261031030000_arena_presentation_qr.sql')
# Reproduce before repair, including all three authorization paths.
for role in ['mc','presentation']:
 v2rpc('competition_state',[c['competitionId'],role,V2_HASH if role=='mc' else 'e'*64,None],fail='column s.item_deadline does not exist' if role=='mc' else 'column s.review does not exist')
print('PASS reproduced pre-fix state failure: nonexistent item_deadline/review columns for MC/presentation')
before=fingerprint()
patch=ROOT/'supabase/migrations/20261101010000_arena_state_projection_fix.sql'
migration(patch)
assert before==fingerprint()
assert v2state(c)['stages'][0]['progress']=={'total':2,'submitted':0}
assert len(v2state(c)['stages'][0]['teamStatus'])==2
for repeat in range(3):
 c=v2fixture(8)
 v2control(c,'presentation_rotate',presentation='e'*64)
 v2control(c,'show_demo',1)
 for role in ['mc','team','presentation']:
  s=v2state(c,role,hash='e'*64 if role=='presentation' else None)
  assert s['demoStage']==1 and s['stages'][0]['progress']=={'total':8,'submitted':0}
  assert s['joinCode']==c['code1']
 v2control(c,'start_stage',1)
 v2control(c,'advance_challenge',1,index=0,fail='teams_pending')
 v2rpc('competition_control',[c['competitionId'],c['teams'][0]['hash'],'advance_challenge',1,None,0,None,None],fail='forbidden')
 parallel(['set role service_role; '+v2call(c,team=i,key=f'{repeat}-{i}-{retry}') for i in range(8) for retry in range(2)])
 for role in ['mc','team','presentation']:
  state=v2state(c,role,hash='e'*64 if role=='presentation' else None)
  stage=state['stages'][0]
  assert stage['progress']=={'total':8,'submitted':8}
  assert stage['totalItems']==6 and stage['itemDeadline']
  assert stage['challenge']['id']=='contrast'
  if role=='presentation':
   assert 'config' not in stage and 'review' not in stage and 'own' not in state and 'teams' not in state
   assert 'optimalCommands' not in json.dumps(state)
 assert len(v2state(c)['stages'][0]['teamStatus'])==8
 assert all(t['submitted'] for t in v2state(c)['stages'][0]['teamStatus'])
 assert len(v2state(c,'team')['own']['submissions'])==1
 assert v2state(c,'team')['own']['submissions'][0]['score'] is None
 v2control(c,'advance_challenge',1,index=0)
 assert v2state(c)['stages'][0]['progress']=={'total':8,'submitted':0}
 sql(v2call(c,key='old-question'),fail='inactive_challenge')
 invariant()
print('PASS three repeated 8-team parallel runs: progress, duplicates, private team state, MC-only progression, reset on advance, inactive-item rejection')
for role in ['anon','authenticated']:
 assert sql(f"select has_schema_privilege('{role}','arena','usage')")=='f'
 assert sql(f"select has_function_privilege('{role}','arena.competition_state(uuid,text,text,uuid)','execute')")=='f'
assert sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and (p.prosecdef or p.proconfig is distinct from ARRAY['search_path=pg_catalog'])")=='0'
assert before==fingerprint()
# Transactional rollback restores exactly previous definition; forward reapply works.
migration(ROOT/'supabase/rollback/20261101010000_arena_state_projection_fix.rollback.sql')
v2rpc('competition_state',[c['competitionId'],'mc',V2_HASH,None],fail='column s.item_deadline does not exist')
migration(patch)
assert v2state(c)['stages'][0]['progress']=={'total':8,'submitted':0}
assert sql("select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock'")=='0'
print('PASS invoker/ACL/browser denial, website isolation, exact rollback/reapply, no unresolved lock waits')
