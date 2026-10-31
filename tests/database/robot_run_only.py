# Local disposable PostgreSQL: apply after all historical regressions, never change old tests/rules.
patch=ROOT/'supabase/migrations/20261101050000_arena_robot_run_only.sql'
rollback=ROOT/'supabase/rollback/20261101050000_arena_robot_run_only.rollback.sql'
before=fingerprint()
old=v5ready();old_state=v2state(old);old_total=v2total(old,2)
migration(patch);migration(rollback);migration(patch)
assert v2total(old,2)==old_total
assert v2stage(old,2)['config']==old_state['stages'][1]['config']
V5_CONFIG2={**V5_CONFIG2,'executionPolicy':'run-only-v1'}
for repeat in range(3):
 c=v5ready(8)
 v2control(c,'presentation_rotate',presentation='e'*64)
 # Every failure is an official execution but free until first success.
 parallel([v5robot(c,team=i,score=0,used=2,success=False,key='collision') for i in range(8)])
 assert all(level(c,i)['officialRuns']==1 and v2total(c,2,i)==0 for i in range(8))
 parallel([v5robot(c,team=i) for i in range(8)])
 assert all(level(c,i)['officialRuns']==2 and v2total(c,2,i)==76 for i in range(8))
 st=v2state(c,'team',0)
 assert all('isOptimal' not in x and 'optimalCommands' not in x and 'extraCommands' not in x for x in st['robotLevels'])
 assert all('config' not in s for s in st['stages'] if s['status']!='finalized')
 spectator=v2state(c,'presentation',hash='e'*64)
 assert 'robotLevels' not in spectator and 'robotDemo' not in spectator
 assert all('config' not in s for s in spectator['stages'])
 # Refresh/reconnect changes no canonical attempts; same idempotency key charges once.
 v5restore(c)
 paid=v5robot(c,score=0,used=2,success=False,opt=True,key='paid-failure')
 replies=parallel([paid]*8)
 assert all('isOptimal' not in json.loads(r)['level'] for r in replies)
 assert level(c)['officialRuns']==3 and level(c)['optimizationAttempts']==1 and v2total(c,2)==71
 sql(v5robot(c,score=84,used=10,opt=True,key='paid-failure'),fail='invalid_idempotency_reuse')
 # New keys cannot evade fees/cap; forced competing requests serialize on the team.
 contenders=[]
 for n in range(6):
  q=v5robot(c,score=100,used=8,opt=True,key='compete-'+str(n))
  contenders.append(q.replace('select arena.process_submission','do $$ begin perform arena.process_submission')+"; exception when others then if sqlerrm<>'optimization_limit' then raise; end if; end $$")
 parallel(contenders)
 assert level(c)['officialRuns']==4 and level(c)['optimizationAttempts']==2 and v2total(c,2)==90
 sql(v5robot(c,opt=True,key='third'),fail='optimization_limit')
 sql(v5robot(c,key='free-after-success'),fail='optimization_required')
 # No optimality oracle: a successful optimal run does not disable the two paid executions.
 sql(v5robot(c,team=1,score=100,used=8,opt=True,key='optimal'))
 sql(v5robot(c,team=1,score=0,used=2,success=False,opt=True,key='optimal-paid-failure'))
 assert level(c,1)['finalScore']==90 and level(c,1)['bestBaseScore']==100
 assert 'isOptimal' not in level(c,1)
 # Current item/deadline/finalization checks protect direct API/RPC calls.
 sql(v5robot(c,team=2,item='2',key='future'),fail='inactive_challenge')
 v3expire(c,2)
 sql(v5robot(c,team=2,key='expired'),fail='inactive_challenge')
 v3close(c,2)
 sql(v5robot(c,team=2,key='closed'),fail='inactive_challenge')
 invariant()
print('PASS run-only: 3x8 teams, failures recorded, 8-way replay charges once after reconnect, 6-way new-key cap races, prior best retained, no optimality oracle, active/future/deadline enforcement')
# Explicit lock-order race checks with the patched scoring function.
for revoke_first in [False,True]:
 c=v5ready();cid=c['competitionId'];tid=c['teams'][0]['team']['id']
 revoke=f"select 1 from arena.competitions where id='{cid}' for update; update arena.teams set token_revoked_at=clock_timestamp() where id='{tid}'"
 if revoke_first:overlap(revoke,v5robot(c),second_error='forbidden');assert v2total(c,2)==0
 else:overlap(v5robot(c),revoke);assert v2total(c,2)==76
for close_first in [False,True]:
 c=v5ready();cid=c['competitionId'];v3expire(c,2)
 close=f"select arena.competition_control('{cid}','{V2_HASH}','close_challenge',2,null,0)"
 # Expired item rejects a fresh run under either lock ordering.
 if close_first:overlap(close,v5robot(c),second_error='inactive_challenge')
 else:
  sql(v5robot(c),fail='inactive_challenge');sql(close)
 assert v2total(c,2)==0
for finalize_first in [False,True]:
 c=v5ready();cid=c['competitionId']
 sql('update arena.competition_stages set active_index=3 where competition_id='+literal(cid)+' and stage_no=2')
 if finalize_first:
  sql('update arena.competition_stages set item_finalized_at=clock_timestamp() where competition_id='+literal(cid)+' and stage_no=2')
  overlap(f"select arena.competition_control('{cid}','{V2_HASH}','finalize_stage',2)",v5robot(c),second_error='stage_closed')
  assert v2total(c,2)==0
 else:
  closing=f"select arena.competition_control('{cid}','{V2_HASH}','close_challenge',2,null,3); select arena.competition_control('{cid}','{V2_HASH}','finalize_stage',2)"
  overlap(v5robot(c),closing)
  assert v2total(c,2)==76
 sql(v5robot(c,key='after-finalization'),fail='stage_closed')
 assert v2stage(c,2)['status']=='finalized'
c=v5ready();sql(v5robot(c,score=60,used=15))
for n in range(2):sql(v5robot(c,score=0,used=2,success=False,opt=True,key='floor-'+str(n)))
assert level(c)['finalScore']==50 and level(c)['bestBaseScore']==60
invariant()
for role in ['anon','authenticated']:
 assert sql(f"select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and has_function_privilege('{role}',p.oid,'execute')")=='0'
assert sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and (p.prosecdef or p.proconfig is distinct from ARRAY['search_path=pg_catalog'])")=='0'
assert before==fingerprint()
sql(rollback.read_text(),fail='forward_fix_required')
print('PASS run-only: revocation/close/finalization lock orders, fee-adjusted 50-point floor, no privileged browser RPC, invoker/search paths, website isolation, safe rollback refusal after new-policy runs')
