# Real disposable PostgreSQL only; executed after all V1/V2/V3/display regressions.
legacy=v2fixture(1);legacy_before=v2state(legacy)
v5path=ROOT/'supabase/migrations/20261101030000_arena_competition_v5.sql'
v5rollback=ROOT/'supabase/rollback/20261101030000_arena_competition_v5.rollback.sql'
before_v5=fingerprint();migration(v5path)
# Exercise schema rollback/reapply before a V5 identity exists.
migration(v5rollback);migration(v5path)
assert v2state(legacy)['competition']==legacy_before['competition']
assert v2state(legacy)['leaderboard']==legacy_before['leaderboard']
V5_CONFIG1={'scenarioIds':['contrast','captions','language','navigation','touch','keyboard'],'questions':[{'id':x,'title':'Synthetic '+x,'context':'Context','question':'Choose','options':[{'id':'o1','label':'One'},{'id':'o2','label':'Two'},{'id':'o3','label':'Three'}]} for x in ['contrast','captions','language','navigation','touch','keyboard']]}
V5_CONFIG2={'levelIds':['1','2','6','4'],'maps':[{'id':x,'name':'Synthetic level '+x,'width':6,'height':6,'start':{'x':0,'y':0},'goal':{'x':1,'y':0},'walls':[],'initialDirection':1,'maxCommands':24} for x in ['1','2','6','4']]}
def v5fixture(teams=1):
 a,b=v2code(),v2code();c=v2rpc('create_competition',['V5 test',V2_HASH,a,b,V5_CONFIG1,V5_CONFIG2]);c.update(code1=a,code2=b,teams=[])
 for i in range(teams):
  h=hashlib.sha256((c['competitionId']+str(i)).encode()).hexdigest()
  t=v2rpc('join_competition',[a,'Synthetic '+str(i),h,h]);t.update(hash=h,recovery=h);c['teams'].append(t)
 return c

def v5finish(c,num=1):
 last=5 if num==1 else 3
 while v2stage(c,num)['active_index']<last:v3expire(c,num);v3advance(c,num)
 v3expire(c,num);v3close(c,num);v2control(c,'finalize_stage',num)

def v5robot(c,score=76,used=11,optimal=8,success=True,opt=False,key='first',team=0,item=None):
 s=v2stage(c,2);t=c['teams'][team];item=item or s['config']['levelIds'][s['active_index']]
 payload={'commands':['left']*used,'optimization':opt,'verification':{'commandsUsed':used,'optimalCommands':optimal}}
 args=[s['round_id'],t['team']['id'],t['hash'],'robot',item,key,payload,success,score,'competition-v5-1',s['config']]
 vals=['true' if a is True else 'false' if a is False else str(a) if isinstance(a,int) else literal(json.dumps(a) if isinstance(a,dict) else a) for a in args]
 return 'set role service_role; select arena.process_submission('+','.join(vals)+')'
def v5restore(c):
 for t in c['teams']:
  restored=v2rpc('join_competition',[c['code1'],None,t['recovery'],t['hash']]);t['team']=restored['team']
def v5ready(teams=1):
 c=v5fixture(teams);v2control(c,'start_stage',1);v5finish(c,1);v5restore(c);v2control(c,'start_stage',2);return c

c=v5ready()
assert v2state(c)['rulesVersion']=='v5'
assert [s['totalItems'] for s in v2state(c)['stages']]==[6,4]
print('PASS V5 migration/rollback/reapply, 6/4 new rooms, existing legacy results unchanged')

def level(c,team=0):
 return v2state(c,'team',team)['robotLevels'][v2stage(c,2)['active_index']]
for repeat in range(5):
 c=v5ready(8)
 # Eight actual independent PostgreSQL connections, no shared team locks.
 parallel([v5robot(c,team=i) for i in range(8)])
 assert [v2total(c,2,i) for i in range(8)]==[76]*8
 retry=v5robot(c,score=0,used=2,success=False,opt=True,key='optimization')
 responses=parallel([retry]*6)
 assert len({json.loads(r)['level']['finalScore'] for r in responses})==1
 assert level(c)['officialRuns']==2 and level(c)['optimizationAttempts']==1 and v2total(c,2)==71
 assert level(c)['bestCommands']==11 and level(c)['bestBaseScore']==76
 # Two competing NEW optimization requests cannot exceed the remaining budget.
 commands=[]
 for k in range(4):
  cmd=v5robot(c,score=84,used=10,opt=True,key='competing-'+str(k))
  commands.append(cmd.replace('select arena.process_submission','do $$ begin perform arena.process_submission')+"; exception when others then if sqlerrm<>'optimization_limit' then raise; end if; end $$")
 parallel(commands)
 assert level(c)['officialRuns']==3 and level(c)['optimizationAttempts']==2
 assert v2total(c,2)==74 and level(c)['bestCommands']==10
 sql(v5robot(c,score=92,used=9,opt=True,key='excess'),fail='optimization_limit')
 sql(v5robot(c,score=0,used=2,success=False,key='free-after-success'),fail='optimization_required')
 # Separate team's next attempt remains isolated.
 sql(v5robot(c,score=100,used=8,opt=True,key='optimal',team=1))
 assert v2total(c,2,1)==95 and v2total(c,2)==74
 assert level(c,1)['isOptimal']
 sql(v5robot(c,score=100,used=8,opt=True,key='unnecessary',team=1),fail='already_optimal')
 assert 'optimalCommands' not in level(c)
 invariant()
print('PASS V5 5 x 8-team concurrent first runs, 6-way idempotent retry, four-way cap race, penalties reduce aggregates, best solution retained, optimal disables retries, canonical totals')

c=v5ready()
for k in range(3):sql(v5robot(c,score=0,used=2,success=False,key='failure'+str(k)))
assert level(c)['officialRuns']==3 and level(c)['finalScore']==0 and level(c)['optimizationAttempts']==0
sql(v5robot(c,score=60,used=15,key='floor'))
for k in range(2):sql(v5robot(c,score=0,used=2,success=False,opt=True,key='paid-fail'+str(k)))
assert v2total(c,2)==50 and level(c)['bestBaseScore']==60 and level(c)['penalty']==10
sql(v5robot(c,score=0,used=2,success=False,opt=True,key='paid-fail2'),fail='optimization_limit')
print('PASS V5 failed runs before first success free; base floor 60, two failed optimizations final 50')

# Equal-floor improvements must retain the shorter successful program even at base 60.
c=v5ready();sql(v5robot(c,score=60,used=16,key='floor-first'))
sql(v5robot(c,score=60,used=14,opt=True,key='floor-shorter'))
assert level(c)['bestCommands']==14 and level(c)['bestBaseScore']==60 and v2total(c,2)==55
sql(v5robot(c,score=60,used=14,optimal=7,opt=True,key='changed-optimum'),fail='round_content_mismatch')
assert level(c)['officialRuns']==2 and level(c)['optimizationAttempts']==1
print('PASS V5 equal-floor shorter solution retained; changed optimal reference rejected atomically')

# Fault injection at validation, attempt insert and aggregate mutation boundaries.
sql("""create function public.v5_fault() returns trigger language plpgsql as $$ begin
 if current_setting('arena.v5_fault',true)=TG_ARGV[0] then raise exception 'v5_injected'; end if; return new; end $$;
create trigger v5_validation before insert on arena.submission_attempts for each row execute function public.v5_fault('validation');
create trigger v5_attempt after insert on arena.submission_attempts for each row execute function public.v5_fault('attempt');
create trigger v5_aggregate before insert or update on arena.team_scores for each row execute function public.v5_fault('aggregate');""")
for phase in ['validation','attempt','aggregate']:
 c=v5ready();sql(v5robot(c))
 retry=v5robot(c,score=0,used=2,success=False,opt=True,key='injected')
 sql("set arena.v5_fault="+literal(phase)+';'+retry,fail='v5_injected')
 assert v2total(c,2)==76 and level(c)['officialRuns']==1 and level(c)['optimizationAttempts']==0
 parallel([retry]*4)
 assert v2total(c,2)==71 and level(c)['officialRuns']==2
 invariant()
sql('drop trigger v5_validation on arena.submission_attempts; drop trigger v5_attempt on arena.submission_attempts; drop trigger v5_aggregate on arena.team_scores; drop function public.v5_fault();')
print('PASS V5 3 fault boundaries roll back attempts, charges and totals; competing retries charge exactly once')

for repeat in range(3):
 c=v5ready();cid=c['competitionId'];s=v2stage(c,2)
 # Local fixture selects last level; no frozen config/deadline edits.
 sql('update arena.competition_stages set active_index=3 where competition_id='+literal(cid)+' and stage_no=2')
 closing=f"select arena.competition_control('{cid}','{V2_HASH}','close_challenge',2,null,3); select arena.competition_control('{cid}','{V2_HASH}','finalize_stage',2)"
 overlap(v5robot(c),closing)
 assert v2total(c,2)==76 and v2stage(c,2)['status']=='finalized'
 sql(v5robot(c,key='late'),fail='stage_closed')
 c=v5ready();cid=c['competitionId'];s=v2stage(c,2)
 sql('update arena.competition_stages set active_index=3,item_finalized_at=clock_timestamp() where competition_id='+literal(cid)+' and stage_no=2')
 closing=f"select arena.competition_control('{cid}','{V2_HASH}','finalize_stage',2)"
 overlap(closing,v5robot(c),second_error='stage_closed')
 assert v2total(c,2)==0
 for revoke_first in [False,True]:
  c=v5ready();cid=c['competitionId'];tid=c['teams'][0]['team']['id']
  revoke=f"select 1 from arena.competitions where id='{cid}' for update; update arena.teams set token_revoked_at=clock_timestamp() where id='{tid}'"
  if revoke_first:overlap(revoke,v5robot(c),second_error='forbidden');assert v2total(c,2)==0
  else:overlap(v5robot(c),revoke);assert v2total(c,2)==76
 invariant()
print('PASS V5 end-stage and token-revocation races: both forced lock orders, 3 repeats; rejected requests change no scores')

# Complete six/four for all eight teams, final authoritative explanations/ceremony.
c=v5fixture(8);v2control(c,'presentation_rotate',presentation='e'*64);v2control(c,'start_stage',1)
for item in V5_CONFIG1['scenarioIds']:
 parallel([v2call(c,item=item,team=i,score=100 if i==0 else 50,key=item) .replace("'competition-v2-1'","'competition-v5-1'") for i in range(8)])
 v3close(c)
 if v2stage(c,1)['active_index']<5:v3advance(c)
v2control(c,'finalize_stage',1)
assert v2state(c)['leaderboard'][0]['accessibility50']==50
v2control(c,'show_demo',2)
before_attempts=sql('select count(*) from arena.submission_attempts')
bench=[]
for k in range(5):
 plan=json.loads(sql("explain (analyze,format json) select arena.competition_state("+literal(c['competitionId'])+",'mc',"+literal(V2_HASH)+",null)"))
 bench.append(plan[0]['Execution Time'])
print('V5 local eight-team MC state RPC execution ms: min='+str(min(bench))+', max='+str(max(bench)),flush=True)
demo=v2state(c,'presentation',hash='e'*64)['robotDemo'];assert demo['version']==0
for hash in [c['teams'][0]['hash'],'e'*64]:v2rpc('competition_control',[c['competitionId'],hash,'robot_demo',None,{'version':0,'op':'queue','commands':['forward']},None,None,None],fail='forbidden')
v2control(c,'robot_demo',config={'version':0,'op':'queue','commands':['forward','left','forward','right','forward']})
v2control(c,'robot_demo',config={'version':0,'op':'queue','commands':[]},fail='stale_demo_version')
v2control(c,'robot_demo',config={'version':1,'op':'run'})
time.sleep(.65)
v2control(c,'robot_demo',config={'version':2,'op':'pause'})
demo=v2state(c,'presentation',hash='e'*64)['robotDemo'];assert demo['status']=='paused' and demo['currentStepIndex']==1
v2control(c,'robot_demo',config={'version':3,'op':'step'})
assert v2state(c,'presentation',hash='e'*64)['robotDemo']['currentStepIndex']==2
v2control(c,'robot_demo',config={'version':4,'op':'resume'});time.sleep(1.6)
demo=v2state(c,'presentation',hash='e'*64)['robotDemo'];assert demo['status']=='completed' and demo['currentStepIndex']==5
assert 'solution' not in demo
v2control(c,'robot_demo',config={'version':5,'op':'explain'})
assert len(v2state(c,'presentation',hash='e'*64)['robotDemo']['solution'])==5
v2control(c,'robot_demo',config={'version':6,'op':'reset'})
assert v2state(c,'presentation',hash='e'*64)['robotDemo']['currentStepIndex']==0
assert sql('select count(*) from arena.submission_attempts')==before_attempts
v2control(c,'end_demo');assert 'robotDemo' not in v2state(c,'presentation',hash='e'*64)
print('PASS V5 server demo trace, MC-only edits, stale version denial, run/pause/step/resume/reset/reconnect, no optimal leakage until demo explanation, ZERO official attempts changed')

v5restore(c);v2control(c,'start_stage',2)
for item in V5_CONFIG2['levelIds']:
 parallel([v5robot(c,score=100 if i==0 else 76,used=8 if i==0 else 11,team=i,item=item,key=item) for i in range(8)])
 v3close(c,2)
 if v2stage(c,2)['active_index']<3:v3advance(c,2)
v2control(c,'finalize_stage',2)
mc=v2state(c);assert mc['resultsState']=='RESULTS_READY'
assert mc['leaderboard'][0]['final100']==100 and mc['leaderboard'][0]['robot']==400
assert mc['leaderboard'][0]['officialRobotRuns']==4 and mc['leaderboard'][0]['optimalRobot']==4
exp=mc['scoreExplanations'][0];assert len(exp['accessibility'])==6 and len(exp['robot'])==4
for e in mc['scoreExplanations']:
 assert sum(q['score'] for q in e['accessibility'])==e['totals']['accessibility']
 assert sum(r['finalScore'] for r in e['robot'])==e['totals']['robot']
for phase in ['waiting','intro']:
 if phase=='intro':
  statement=f"do $$ begin perform arena.competition_control('{c['competitionId']}','{V2_HASH}','ceremony',null,'{{\"phase\":\"intro\",\"expectedPhase\":\"waiting\"}}'::jsonb); exception when others then if sqlerrm<>'invalid_transition' then raise; end if; end $$"
  parallel([statement]*4)
 public=v2state(c,'presentation',hash='e'*64)
 assert 'leaderboard' not in public and 'scoreExplanations' not in public and 'winnerTeamId' not in public['competition']
 assert public['resultsState']=='RESULTS_READY'
v2control(c,'publish',fail='ceremony_required')
v2control(c,'ceremony',config={'phase':'ranking','expectedPhase':'intro'})
public=v2state(c,'presentation',hash='e'*64);assert len(public['leaderboard'])==8 and 'winnerTeamId' not in public['competition']
v2control(c,'ceremony',config={'phase':'winner','expectedPhase':'ranking'})
assert v2state(c,'presentation',hash='e'*64)['competition']['winnerTeamId']==c['teams'][0]['competitionTeamId']
v2control(c,'ceremony',config={'phase':'explanation','expectedPhase':'winner'})
assert len(v2state(c,'presentation',hash='e'*64)['scoreExplanations'])==1
assert 'history' not in json.dumps(v2state(c,'presentation',hash='e'*64)['scoreExplanations'])
v2control(c,'ceremony',config={'phase':'closing','expectedPhase':'explanation'})
assert len(v2state(c,'team')['scoreExplanations'])==1
sql(v5robot(c,key='after-final'),fail='stage_closed')
sql("update arena.competitions set rules_version='legacy' where id="+literal(c['competitionId']),fail='configuration_frozen')
print('PASS V5 full eight-team 6+4 flow, 600/400 -> 50+50=100, reconciled explanations, private RESULTS_READY, staged MC publication, winner gate, frozen results/rules')

# Exact score comparison and canonical tie metrics, synthetic finalized snapshots.
c=v5fixture(4)
for i,(a,b,opt,runs,perfect) in enumerate([(599,399,2,8,5),(599,399,3,9,4),(599,399,3,8,3),(599,399,3,8,4)]):
 ct=c['teams'][i]['competitionTeamId']
 sql(f"insert into arena.competition_results(competition_id,stage_no,competition_team_id,raw_score,perfect_count,official_runs) values('{c['competitionId']}',1,'{ct}',{a},{perfect},0),('{c['competitionId']}',2,'{ct}',{b},{opt},{runs})")
ranks={t['teamId']:t['rank'] for t in v2state(c)['leaderboard']}
assert [ranks[t['competitionTeamId']] for t in c['teams']]==[4,3,2,1]
# A fully tied result must NOT choose an arbitrary winner.
c=v5ready(2);v5finish(c,2)
assert len(v2state(c)['tie']['candidates'])==2
v2control(c,'ceremony',config={'phase':'intro','expectedPhase':'waiting'})
v2control(c,'ceremony',config={'phase':'ranking','expectedPhase':'intro'},fail='tie_unresolved')
v2control(c,'start_tiebreak')
for i,t in enumerate(c['teams']):v2rpc('submit_competition_tie',[c['competitionId'],t['team']['id'],t['hash'],'o1' if i else 'o2',50 if i else 100,1])
v2control(c,'finalize_tiebreak')
v2control(c,'ceremony',config={'phase':'ranking','expectedPhase':'intro'})
assert v2state(c)['competition']['winnerTeamId']==c['teams'][0]['competitionTeamId']
print('PASS V5 exact ranking: equal numerator -> optimal levels -> fewer runs -> perfect Accessibility; unresolved ties cannot publish')

for role in ['anon','authenticated']:
 assert sql(f"select has_schema_privilege('{role}','arena','usage')")=='f'
 assert sql(f"select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and has_function_privilege('{role}',p.oid,'execute')")=='0'
assert sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and (p.prosecdef or p.proconfig is distinct from ARRAY['search_path=pg_catalog'])")=='0'
assert before_v5==fingerprint();invariant()
assert sql("select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock'")=='0'
sql(v5rollback.read_text(),fail='V5 rollback blocked')
print('PASS V5 website isolation, restricted grants/RLS, invoker/search_path, canonical totals, rollback safety guard, zero deadlocks/unresolved waits')

archive=Path('/tmp')/f'arena-v5-{uuid.uuid4()}.dump';original_db=os.environ['PGDATABASE']
try:
 expected=sql("select count(*)||':'||coalesce(sum(calculated_score),0) from arena.submission_attempts")
 subprocess.run(['pg_dump','-Fc','-f',str(archive)],check=True,capture_output=True)
 subprocess.run(['createdb','restored_arena_v5'],check=True,capture_output=True)
 subprocess.run(['pg_restore','--exit-on-error','--dbname','restored_arena_v5',str(archive)],check=True,capture_output=True)
 os.environ['PGDATABASE']='restored_arena_v5'
 assert sql("select count(*)||':'||coalesce(sum(calculated_score),0) from arena.submission_attempts")==expected
 invariant()
 assert sql("select has_schema_privilege('anon','arena','usage')")=='f'
 assert v2state(legacy)['competition']==legacy_before['competition']
finally:
 os.environ['PGDATABASE']=original_db;archive.unlink(missing_ok=True)
print('PASS V5 custom-format dump/restore: canonical attempts, aggregate invariants, legacy identity and restricted grants survive')
