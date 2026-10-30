# Executed in the existing local-only disposable cluster after V1 regression tests.
migration(ROOT / 'supabase/migrations/20261030165721_arena_competition_v2.sql')
print('PASS Competition V2 migration applies after existing website and Arena migrations')
assert website_before == fingerprint()

V2_HASH = 'a'*64
V2_CONFIG1 = {'scenarioIds':['contrast','captions','language','navigation'], 'questions':[{'id':x,'title':'Synthetic question','context':'Context','question':'Choose','options':[{'id':f'o{i}','label':f'Option {i}'} for i in range(1,4)]} for x in ['contrast','captions','language','navigation']]}
V2_CONFIG2 = {'levelIds':['6','4','7'], 'maps':[{'id':x,'name':'Synthetic map','width':6,'height':6,'start':{'x':0,'y':0},'goal':{'x':1,'y':0},'walls':[],'initialDirection':1,'maxCommands':24} for x in ['6','4','7']]}

def v2rpc(name,args,fail=None):
    values=['null' if a is None else str(a).lower() if isinstance(a,(int,bool)) else literal(json.dumps(a) if isinstance(a,(dict,list)) else a) for a in args]
    statement='set role service_role; select arena.'+name+'('+','.join(values)+')'
    out=sql(statement,fail=fail)
    return json.loads(out) if not fail and out and out[0] in '[{' else out

def v2code():
    return uuid.uuid4().hex[:6].upper().replace('0','2').replace('1','3')

def v2fixture(teams=1):
    a,b=v2code(),v2code()
    c=v2rpc('create_competition',['V2 test',V2_HASH,a,b,V2_CONFIG1,V2_CONFIG2])
    c.update(code1=a,code2=b,teams=[])
    for i in range(teams):
        recovery=hashlib.sha256(f'{c["competitionId"]}-recovery-{i}'.encode()).hexdigest()
        th=hashlib.sha256(f'{c["competitionId"]}-team-{i}'.encode()).hexdigest()
        t=v2rpc('join_competition',[a,f'Team {i}',recovery,th]);t.update(recovery=recovery,hash=th)
        c['teams'].append(t)
    return c

def v2control(c,action,stage=None,config=None,index=None,request=None,presentation=None,fail=None):
    return v2rpc('competition_control',[c['competitionId'],V2_HASH,action,stage,config,index,request,presentation],fail)

def v2stage(c,num):
    return json.loads(sql("select row_to_json(s) from arena.competition_stages s where competition_id="+literal(c['competitionId'])+' and stage_no='+str(num)))

def v2call(c,item='contrast',score=100,key='k',team=0,stage=1,successful=True):
    st=v2stage(c,stage);t=c['teams'][team]
    args=[st['round_id'],t['team']['id'],t['hash'],'accessibility' if stage==1 else 'robot',item,key,{'answerId':'o2'} if stage==1 else {'commands':['forward']},successful,score,'competition-v2-1',st['config']]
    values=['true' if a is True else 'false' if a is False else str(a) if isinstance(a,int) else literal(json.dumps(a) if isinstance(a,dict) else a) for a in args]
    return 'select arena.process_submission('+','.join(values)+')'

def v2total(c,stage=1,team=0):
    st=v2stage(c,stage);return int(sql('select coalesce((select score from arena.team_scores where round_id='+literal(st['round_id'])+' and team_id='+literal(c['teams'][team]['team']['id'])+'),0)'))

def v2state(c,role='mc',team=0,hash=None):
    return v2rpc('competition_state',[c['competitionId'],role,hash or (V2_HASH if role=='mc' else c['teams'][team]['hash']),c['teams'][team]['team']['id'] if role=='team' else None])

c=v2fixture(0)
# Nine actual parallel connections contend on one competition registration lock.
statements=[]
for i in range(9):
    h=hashlib.sha256(f'parallel-{i}'.encode()).hexdigest()
    statements.append(f"set role service_role; do $$ begin perform arena.join_competition('{c['code1']}','Parallel {i}','{h}','{h}'); exception when others then if sqlerrm<>'room_team_limit_reached' then raise; end if; end $$;")
parallel(statements)
assert sql("select count(*) from arena.competition_teams where competition_id="+literal(c['competitionId']))=='8'
assert sql("select count(*) from arena.teams t join arena.rooms r on r.id=t.room_id where r.competition_id="+literal(c['competitionId']))=='16'
print('PASS V2 nine concurrent registrations: exactly 8 stable identities and 16 pre-associated room teams')

for repeat in range(5):
 c=v2fixture(8)
 v2control(c,'start_stage',2,fail='invalid_transition')
 v2control(c,'finalize_stage',1,fail='invalid_transition')
 v2rpc('join_competition',[c['code2'],None,c['teams'][0]['recovery'],'b'*64],fail='stage_locked')
 v2control(c,'start_stage',1)
 assert v2stage(c,1)['config']==V2_CONFIG1
 assert round((__import__('datetime').datetime.fromisoformat(v2stage(c,1)['deadline_at'])-__import__('datetime').datetime.fromisoformat(v2stage(c,1)['started_at'])).total_seconds())==600
 v2control(c,'configure',1,{},fail='configuration_frozen')
 sql(f"update arena.competition_stages set config='{{}}' where competition_id='{c['competitionId']}' and stage_no=1",fail='configuration_frozen')
 parallel(['set role service_role; '+v2call(c,item=q,key=q) for q in V2_CONFIG1['scenarioIds'][:2]])
 assert v2total(c)==200
 parallel(['set role service_role; '+v2call(c,item=q,key=q) for q in V2_CONFIG1['scenarioIds']])
 assert v2total(c)==400
 parallel(['set role service_role; '+v2call(c,key='duplicate-'+str(i)) for i in range(8)])
 assert v2total(c)==400
 parallel(['set role service_role; '+v2call(c,team=i,key='team-'+str(i)) for i in range(8)])
 assert [v2total(c,team=i) for i in range(8)]==[400]+[100]*7
 s=v2state(c,'team');assert all(x['score'] is None for x in s['own']['submissions'])
 assert s['leaderboard'][0]['final100']==0 # no active-stage totals in official aggregation
 v2control(c,'finalize_stage',1)
 v2control(c,'finalize_stage',1,fail='invalid_transition')
 sql(v2call(c,item='contrast',key='late'),fail='stage_closed')
 assert v2state(c)['leaderboard'][0]['accessibility50']==50
 assert v2state(c)['competition']['winnerTeamId'] is None
 # Stage 2 restoration uses credential, ignores names; rotation revokes the prior room session.
 for i,t in enumerate(c['teams']):
  restored=v2rpc('join_competition',[c['code2'],None,t['recovery'],'c'*63+str(i)])
  assert restored['competitionTeamId']==t['competitionTeamId']
  t.update(team=restored['team'],hash='c'*63+str(i))
 v2rpc('join_competition',[c['code2'],'Intruder','e'*64,'f'*64],fail='forbidden')
 v2control(c,'start_stage',2)
 st=v2stage(c,2)
 assert round((__import__('datetime').datetime.fromisoformat(st['deadline_at'])-__import__('datetime').datetime.fromisoformat(st['started_at'])).total_seconds())==900
 parallel(['set role service_role; '+v2call(c,item='6',score=p,key=f'robot-{i}',stage=2,successful=p>0) for i,p in enumerate([60,100,84,0,92,60])])
 assert v2total(c,2)==100
 assert v2total(c,2,1)==0
 v2control(c,'publish',fail='tie_unresolved')
 v2control(c,'finalize_stage',2)
 lb=v2state(c)['leaderboard'];assert lb[0]['accessibility']==400 and lb[0]['robot']==100
 assert abs(float(lb[0]['final100'])-(50+100/6))<1e-8
 v2control(c,'publish')
 assert v2state(c)['competition']['winnerTeamId']==c['teams'][0]['competitionTeamId']
 v2control(c,'publish',fail='competition_finalized')
 invariant()
print('PASS V2 5 repeats: parallel 2/4 Accessibility items=200/400, duplicate keys, eight-team isolation, 100/50/0-compatible records, best Robot score, finalized-only equal weighting, immutable lifecycle')

# Natural tie: publication must wait for a unique merit/sudden-death winner.
c=v2fixture(2);v2control(c,'start_stage',1);v2control(c,'finalize_stage',1)
for i,t in enumerate(c['teams']):
 r=v2rpc('join_competition',[c['code2'],None,t['recovery'],'d'*63+str(i)]);t.update(team=r['team'],hash='d'*63+str(i))
v2control(c,'start_stage',2);v2control(c,'finalize_stage',2)
v2control(c,'publish',fail='tie_unresolved');v2control(c,'start_tiebreak')
v2control(c,'finalize_tiebreak',fail='tie_answers_pending')
for i,t in enumerate(c['teams']):
 v2rpc('submit_competition_tie',[c['competitionId'],t['team']['id'],t['hash'],'o1' if i else 'o2',50 if i else 100,1])
v2control(c,'finalize_tiebreak');v2control(c,'publish')
assert v2state(c)['competition']['winnerTeamId']==c['teams'][0]['competitionTeamId']
print('PASS V2 deterministic tie, pending-answer guard, sudden death and exactly one published winner')

# An unanswered sudden-death scores zero, consistently with a submitted zero.
# Neither gets an artificial ranking advantage; another challenge can decide.
c=v2fixture(2);v2control(c,'start_stage',1);v2control(c,'finalize_stage',1)
for i,t in enumerate(c['teams']):
 r=v2rpc('join_competition',[c['code2'],None,t['recovery'],'d'*63+str(i)]);t.update(team=r['team'],hash='d'*63+str(i))
v2control(c,'start_stage',2);v2control(c,'finalize_stage',2);v2control(c,'start_tiebreak')
t=c['teams'][0];v2rpc('submit_competition_tie',[c['competitionId'],t['team']['id'],t['hash'],'o3',0,1])
sql("update arena.competitions set tie_deadline_at=clock_timestamp()-interval '1 second' where id="+literal(c['competitionId']))
v2control(c,'finalize_tiebreak');assert [r['rank'] for r in v2state(c)['leaderboard']]==[1,1]
v2control(c,'publish',fail='tie_unresolved');v2control(c,'start_tiebreak')
for i,t in enumerate(c['teams']):v2rpc('submit_competition_tie',[c['competitionId'],t['team']['id'],t['hash'],'o1' if i else 'o3',100 if i else 50,2])
v2control(c,'finalize_tiebreak');v2control(c,'publish')
assert v2state(c)['leaderboard'][0]['teamId']==v2state(c)['competition']['winnerTeamId']==c['teams'][1]['competitionTeamId']
print('PASS V2 absent/zero sudden-death tie stays tied; later unique winner matches leaderboard rank1')

# Capability isolation, minimal spectator fields, expiry/revocation.
c=v2fixture();v2control(c,'presentation_rotate',presentation='9'*64)
spectator=v2state(c,'presentation',hash='9'*64)
assert 'teams' not in spectator and 'own' not in spectator and 'leaderboard' not in spectator
assert all('config' not in s and 'review' not in s for s in spectator['stages'])
v2rpc('competition_state',[c['competitionId'],'mc','9'*64,None],fail='forbidden')
v2rpc('competition_state',[c['competitionId'],'team',V2_HASH,c['teams'][0]['team']['id']],fail='forbidden')
v2control(c,'start_stage',1)
active_spectator=v2state(c,'presentation',hash='9'*64)
challenge=active_spectator['stages'][0]['challenge'];assert set(challenge)=={'id','title','context','question','options'}
assert all(set(o)=={'id','label'} for o in challenge['options'])
v2rpc('competition_state',[c['competitionId'],'presentation','0'*64,None],fail='forbidden')
v2rpc('competition_control',[c['competitionId'],'9'*64,'finalize_stage',1,None,None,None,None],fail='forbidden')
v2control(c,'presentation_revoke');v2rpc('competition_state',[c['competitionId'],'presentation','9'*64,None],fail='forbidden')
v2control(c,'presentation_rotate',presentation='8'*64)
sql("update arena.competitions set presentation_expires_at=clock_timestamp()-interval '1 second' where id="+literal(c['competitionId']))
v2rpc('competition_state',[c['competitionId'],'presentation','8'*64,None],fail='forbidden')
print('PASS V2 spectator allowlist, MC/team separation, token expiry and revocation')

# Both serialization orders for finalization and recovery/token revocation.
for first_submission in [True,False]:
 for rep in range(3):
  c=v2fixture();v2control(c,'start_stage',1)
  end=f"select arena.competition_control('{c['competitionId']}','{V2_HASH}','finalize_stage',1)"
  if first_submission:
   overlap(v2call(c),end);assert v2total(c)==100
  else:
   overlap(end,v2call(c),'stage_closed');assert v2total(c)==0
  invariant()
  c=v2fixture();v2control(c,'start_stage',1)
  req=v2rpc('request_competition_recovery',[c['competitionId'],c['teams'][0]['competitionTeamId'],'5'*64])
  revoke=f"select arena.competition_control('{c['competitionId']}','{V2_HASH}','approve_recovery',null,null,null,'{req}')"
  if first_submission:
   overlap(v2call(c),revoke);assert v2total(c)==100
  else:
   overlap(revoke,v2call(c),'forbidden');assert v2total(c)==0
  v2rpc('join_competition',[c['code1'],None,c['teams'][0]['recovery'],'6'*64],fail='forbidden')
  recovered=v2rpc('join_competition',[c['code1'],None,'5'*64,'6'*64]);assert recovered['competitionTeamId']==c['teams'][0]['competitionTeamId']
  invariant()
print('PASS V2 finalize and recovery/revocation races: both orders, 3 repeats; no partial scores; stable identity restored')

# Test-only time travel: production functions expose no clock override or deadline extension.
c=v2fixture();v2control(c,'start_stage',1)
sql("alter table arena.competition_stages disable trigger freeze_competition_stage; update arena.competition_stages set started_at=clock_timestamp()-interval '12 minutes',deadline_at=clock_timestamp()-interval '2 minutes' where competition_id="+literal(c['competitionId'])+"; alter table arena.competition_stages enable trigger freeze_competition_stage;")
sql(v2call(c),fail='stage_closed');assert v2total(c)==0
# Deadline expires while waiting on the team row lock.
c=v2fixture();v2control(c,'start_stage',1)
sql("alter table arena.competition_stages disable trigger freeze_competition_stage; update arena.competition_stages set deadline_at=clock_timestamp()+interval '0.15 seconds' where competition_id="+literal(c['competitionId'])+"; alter table arena.competition_stages enable trigger freeze_competition_stage;")
overlap("select 1 from arena.teams where id="+literal(c['teams'][0]['team']['id'])+' for update',v2call(c),'stage_closed');assert v2total(c)==0
print('PASS V2 server deadline, including expiry during team-lock wait')

# Fault injection stays in local fixtures, never in production RPCs.
sql("""create function arena.v2_test_fault() returns trigger language plpgsql as $$ begin if current_setting('arena.v2_fault',true)=TG_ARGV[0] then raise exception 'v2_injected'; end if; return new; end $$;
create trigger v2_fault_before before insert on arena.submission_attempts for each row execute function arena.v2_test_fault('validation');
create trigger v2_fault_after after insert on arena.submission_attempts for each row execute function arena.v2_test_fault('attempt');
create trigger v2_fault_aggregate before insert on arena.team_scores for each row execute function arena.v2_test_fault('aggregate');""")
for phase in ['validation','attempt','aggregate']:
 c=v2fixture();v2control(c,'start_stage',1)
 sql("set arena.v2_fault="+literal(phase)+"; "+v2call(c),fail='v2_injected')
 assert v2total(c)==0
 assert sql("select count(*) from arena.submission_attempts where round_id="+literal(v2stage(c,1)['round_id']))=='0'
 sql(v2call(c));assert v2total(c)==100;invariant()
sql('drop trigger v2_fault_before on arena.submission_attempts; drop trigger v2_fault_after on arena.submission_attempts; drop trigger v2_fault_aggregate on arena.team_scores; drop function arena.v2_test_fault();')
print('PASS V2 validation/attempt/aggregate fault boundaries roll back fully; retries succeed once')

for role in ['anon','authenticated']:
 assert sql(f"select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and has_function_privilege('{role}',p.oid,'execute')")=='0'
 assert sql(f"select count(*) from pg_tables where schemaname='arena' and has_table_privilege('{role}',schemaname||'.'||tablename,'SELECT,INSERT,UPDATE,DELETE')")=='0'
assert sql("select count(*) from pg_tables where schemaname='arena' and not rowsecurity")=='0'
assert sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and (p.prosecdef or p.proconfig is distinct from ARRAY['search_path=pg_catalog'])")=='0'
assert website_before==fingerprint()
assert sql("select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock'")=='0'
print('PASS V2 grants/RLS/search_path, original website fingerprint, aggregate invariants and no unresolved lock waits')

# Equal raw totals use merit, never arrival order or rounded display values.
c=v2fixture(2);v2control(c,'start_stage',1)
for team,scores in enumerate([[100,100,0,0],[100,50,50,0]]):
 for q,score in zip(V2_CONFIG1['scenarioIds'],scores):sql(v2call(c,item=q,score=score,team=team,key=q))
v2control(c,'finalize_stage',1)
rows=v2state(c)['leaderboard'];assert [r['rank'] for r in rows]==[1,2];assert rows[0]['teamId']==c['teams'][0]['competitionTeamId']
c=v2fixture(2);v2control(c,'start_stage',1);v2control(c,'finalize_stage',1);v2control(c,'start_stage',2)
for team,scores in enumerate([[100,84],[92,92]]):
 for item,score in zip(['6','4'],scores):
  statement=v2call(c,item=item,score=score,team=team,key=item,stage=2).replace(c['teams'][team]['team']['id'],sql("select id from arena.teams where competition_team_id="+literal(c['teams'][team]['competitionTeamId'])+" and room_id="+literal(v2stage(c,2)['room_id'])))
  sql("update arena.teams set join_token_hash="+literal(c['teams'][team]['hash'])+",token_revoked_at=null where competition_team_id="+literal(c['teams'][team]['competitionTeamId']))
  sql(statement)
v2control(c,'finalize_stage',2);rows=v2state(c)['leaderboard'];assert [r['rank'] for r in rows]==[1,2];assert rows[0]['optimalRobot']==1
print('PASS V2 equal raw totals ranked by perfect Accessibility then optimal Robot, without time or rounding')

# Independent teams remain concurrent under V2 SHARE locks.
c=v2fixture(2);v2control(c,'start_stage',1)
with futures.ThreadPoolExecutor() as pool:
 holder=pool.submit(sql,'begin; '+v2call(c)+'; select pg_sleep(1); commit;',None,'v2-independent')
 wait_sleep('v2-independent')
 sql(v2call(c,team=1));assert not holder.done()
 holder.result()
assert [v2total(c,team=i) for i in range(2)]==[100,100];invariant()
print('PASS V2 independent teams do not serialize on competition/stage/room SHARE locks')

# V2 concurrent start/finalize administrative calls cannot create duplicate rounds/results.
c=v2fixture()
def duplicate_control(action):
 return f"do $$ begin perform arena.competition_control('{c['competitionId']}','{V2_HASH}','{action}',1); exception when others then if sqlerrm<>'invalid_transition' then raise; end if; end $$"
parallel([duplicate_control('start_stage') for _ in range(4)])
assert sql("select count(*) from arena.rounds where room_id="+literal(v2stage(c,1)['room_id']))=='1'
parallel([duplicate_control('finalize_stage') for _ in range(4)])
assert sql("select count(*) from arena.competition_results where competition_id="+literal(c['competitionId']))=='1'
sql("update arena.competition_results set raw_score=400 where competition_id="+literal(c['competitionId']),fail='finalized_result_immutable')
print('PASS V2 concurrent administrative starts/finalizations create one round and snapshot; frozen results reject UPDATE')

# Preserve canonical result rows and grants through a real custom-format restore.
archive=Path('/tmp')/f'arena-v2-local-{uuid.uuid4()}.dump'
original_db=os.environ['PGDATABASE']
def portable_website_fingerprint():
 return sql("""select md5(string_agg(v,E'\\n' order by v)) from (
 select 'table:'||c.relname||':'||c.relrowsecurity||':'||coalesce(c.relacl::text,'') v from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth')
 union all select 'policy:'||row_to_json(p)::text from pg_policies p where schemaname in ('public','auth')
 union all select 'function:'||pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','auth')
 union all select 'trigger:'||pg_get_triggerdef(t.oid) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth') and not t.tgisinternal
 union all select 'constraint:'||n.nspname||'.'||c.relname||':'||k.conname||':'||pg_get_constraintdef(k.oid) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth')
 ) s""")
portable_before=portable_website_fingerprint()
try:
 subprocess.run(['pg_dump','-Fc','-f',str(archive)],check=True,capture_output=True)
 subprocess.run(['createdb','restored_arena_v2'],check=True,capture_output=True)
 subprocess.run(['pg_restore','--exit-on-error','--dbname','restored_arena_v2',str(archive)],check=True,capture_output=True)
 os.environ['PGDATABASE']='restored_arena_v2'
 assert portable_before==portable_website_fingerprint()
 restored_website_before=fingerprint()
 assert int(sql('select count(*) from arena.competition_results'))>0
 invariant()
 sql((ROOT/'supabase/verification-competition-v2.sql').read_text())
 sql((ROOT/'supabase/rollback/20261030165721_arena_competition_v2.rollback.sql').read_text(),fail='V2 rollback requires')
 # Prior failed psql transaction rolled back; explicit test-only operator approval.
 sql("set arena.confirm_v2_rollback='reviewed-backup';"+(ROOT/'supabase/rollback/20261030165721_arena_competition_v2.rollback.sql').read_text())
 assert sql("select to_regclass('arena.competitions') is null")=='t'
 assert sql("select count(*) from pg_tables where schemaname='arena'")=='7'
 assert restored_website_before==fingerprint()
 # V1 legacy scoring functions and grants are restored, not fabricated placeholders.
 assert sql("select has_function_privilege('service_role','arena.process_submission(uuid,uuid,text,text,text,text,jsonb,boolean,integer,text,jsonb)','EXECUTE')")=='t'
 assert sql("select has_function_privilege('anon','arena.process_submission(uuid,uuid,text,text,text,text,jsonb,boolean,integer,text,jsonb)','EXECUTE')")=='f'
 migration(ROOT/'supabase/migrations/20261030165721_arena_competition_v2.sql')
 assert restored_website_before==fingerprint()
 print('PASS V2 full dump/restore, verification SQL, guarded rollback, preserved legacy Arena + website, and reapply')
finally:
 os.environ['PGDATABASE']=original_db
 archive.unlink(missing_ok=True)
