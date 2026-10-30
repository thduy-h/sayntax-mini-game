# Runs after all existing V1/V2 regressions, on disposable localhost only.
v3path=ROOT/'supabase/migrations/20261031010000_arena_competition_v3.sql'
v3rollback=ROOT/'supabase/rollback/20261031010000_arena_competition_v3.rollback.sql'
before_v3=fingerprint()
function_hashes=sql("select md5(string_agg(pg_get_functiondef(p.oid), E'\\n' order by p.proname)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and p.proname in ('join_competition','competition_control','process_submission','competition_state','freeze_competition_stage')")
migration(v3path)
assert before_v3==fingerprint()
print('PASS V3 additive migration, website fingerprint unchanged')

def v3close(c,num=1):
 s=v2stage(c,num);v2control(c,'close_challenge',num,index=s['active_index'])
def v3advance(c,num=1):
 s=v2stage(c,num);v2control(c,'advance_challenge',num,index=s['active_index'])
def v3expire(c,num=1):
 sql("update arena.competition_stages set item_deadline_at=clock_timestamp()-interval '1 second' where competition_id="+literal(c['competitionId'])+' and stage_no='+str(num))
def v3finish(c,num=1):
 while v2stage(c,num)['active_index']<(3 if num==1 else 2):
  v3expire(c,num);v3advance(c,num)
 v3expire(c,num);v3close(c,num);v2control(c,'finalize_stage',num)

for repeat in range(6):
 c=v2fixture(8)
 v2control(c,'show_demo',1)
 state=v2state(c);assert state['demoStage']==1 and state['joinCode']==c['code1']
 assert sql("select count(*) from arena.submission_attempts a join arena.competition_stages s on s.round_id=a.round_id where s.competition_id="+literal(c['competitionId']))=='0'
 # Neither participant nor presentation hashes authorize MC transitions.
 v2rpc('competition_control',[c['competitionId'],c['teams'][0]['hash'],'start_stage',1,None,None,None,None],fail='forbidden')
 v2control(c,'presentation_rotate',presentation='e'*64)
 v2rpc('competition_control',[c['competitionId'],'e'*64,'start_stage',1,None,None,None,None],fail='forbidden')
 v2control(c,'start_stage',1)
 assert v2state(c)['demoStage'] is None
 assert len({v2state(c,'team',i)['stages'][0]['activeItemId'] for i in range(8)})==1
 assert 'config' not in v2state(c,'team')['stages'][0]
 sql(v2call(c,item='captions'),fail='inactive_challenge')
 v2control(c,'advance_challenge',1,index=0,fail='teams_pending')
 v2control(c,'challenge',1,index=3,fail='mc_progression_required')
 # Genuine concurrent connections: same active item across eight teams, many retry keys.
 parallel(['set role service_role; '+v2call(c,team=i,key='q0-'+str(k)) for i in range(8) for k in range(3)])
 assert [v2total(c,team=i) for i in range(8)]==[100]*8
 assert v2state(c)['stages'][0]['progress']=={'total':8,'submitted':8}
 sql(v2call(c,key="spectator").replace(c['teams'][0]['hash'],'e'*64),fail='forbidden')
 assert len(v2state(c)['stages'][0]['teamStatus'])==8
 presentation=v2state(c,'presentation',hash='e'*64)
 assert presentation['stages'][0]['progress']=={'total':8,'submitted':8}
 assert 'config' not in presentation['stages'][0] and 'teams' not in presentation and 'own' not in presentation
 assert 'optimalCommands' not in json.dumps(presentation) and 'verified_score' not in json.dumps(presentation)
 # Repeated MC requests with the same expected index advance exactly once.
 cmd=f"do $$ begin perform arena.competition_control('{c['competitionId']}','{V2_HASH}','advance_challenge',1,null,0); exception when others then if sqlerrm<>'invalid_transition' then raise; end if; end $$;"
 parallel([cmd]*4)
 assert v2stage(c,1)['active_index']==1
 sql(v2call(c,key='past'),fail='inactive_challenge')
 for index,item in enumerate(V2_CONFIG1['scenarioIds'][1:],1):
  assert v2stage(c,1)['active_index']==index
  parallel(['set role service_role; '+v2call(c,item=item,team=i,key=item) for i in range(8)])
  if index<3:v3advance(c)
 v3close(c)
 sql(v2call(c,item='navigation',key='closed'),fail='inactive_challenge')
 v2control(c,'finalize_stage',1)
 assert all(v2total(c,team=i)==400 for i in range(8))
 assert v2state(c)['leaderboard'][0]['accessibility50']==50
 # One canonical code, eight existing identities, both room tokens rotate together.
 for i,t in enumerate(c['teams']):
  h=hashlib.sha256(f'restore-v3-{repeat}-{i}'.encode()).hexdigest()
  r=v2rpc('join_competition',[c['code1'],None,t['recovery'],h])
  assert r['stage']==2 and r['competitionTeamId']==t['competitionTeamId']
  t.update(team=r['team'],hash=h)
 assert sql("select count(*) from arena.competition_teams where competition_id="+literal(c['competitionId']))=='8'
 assert v2state(c)['joinCode']==c['code1']
 v2rpc('join_competition',[c['code1'],'Fake team','9'*64,'8'*64],fail='forbidden')
 v2control(c,'show_demo',2)
 assert v2state(c,'presentation',hash='e'*64)['demoStage']==2
 v2control(c,'start_stage',2)
 assert len({v2state(c,'team',i)['stages'][1]['activeItemId'] for i in range(8)})==1
 sql(v2call(c,item='4',stage=2),fail='inactive_challenge')
 parallel(['set role service_role; '+v2call(c,item='6',stage=2,score=p,successful=p>0,key=str(k)) for k,p in enumerate([60,100,0,92,84])])
 assert v2total(c,2)==100
 # Failed attempt counts as submitted but never earns completion credit.
 for i in range(1,8):sql(v2call(c,item='6',stage=2,team=i,score=0,successful=False,key='fail'))
 assert v2state(c)['stages'][1]['progress']['submitted']==8
 assert all(v2total(c,2,i)==0 for i in range(1,8))
 v3advance(c,2)
 sql(v2call(c,item='6',stage=2,key='old-map'),fail='inactive_challenge')
 v2control(c,'finalize_stage',2,fail='challenges_pending')
 v3finish(c,2)
 v2control(c,'publish')
 assert v2state(c)['competition']['winnerTeamId']==c['teams'][0]['competitionTeamId']
 sql("update arena.competition_stages set active_index=0 where competition_id="+literal(c['competitionId'])+' and stage_no=1',fail='stage_closed')
 invariant()
print('PASS V3 six repeated eight-team runs: synchronized active question/map, MC CAS progression, current-only submissions, duplicates, best Robot retry, persistent code/recovery, zero demo XP, frozen final scores')

# Both orderings: an accepted submission precedes close; close-first rejects late writes.
c=v2fixture();v2control(c,'start_stage',1)
v3expire(c)
sql(v2call(c),fail='inactive_challenge')
assert v2total(c)==0
v3advance(c)
sql(v2call(c,item='contrast'),fail='inactive_challenge')
# Deadline checked again after waiting on the team lock.
st=v2stage(c,1)
sql("update arena.competition_stages set item_deadline_at=clock_timestamp()+interval '0.15 seconds' where competition_id="+literal(c['competitionId'])+' and stage_no=1')
with futures.ThreadPoolExecutor() as pool:
 holder=pool.submit(sql,"begin; select 1 from arena.teams where id="+literal(c['teams'][0]['team']['id'])+" for update; select pg_sleep(.4); commit;",None,'v3-deadline')
 wait_sleep('v3-deadline')
 sql(v2call(c,item='captions'),fail='inactive_challenge');holder.result()
assert v2total(c)==0
print('PASS V3 inactive/expired item rejection including deadline elapsed while waiting on team lock')

# Fault rollback while processing the current item; retry recovers once.
c=v2fixture();v2control(c,'start_stage',1)
sql("""create function public.v3_fault() returns trigger language plpgsql as $$ begin raise exception 'v3_injected'; end $$;
create trigger v3_fault after insert on arena.submission_attempts for each row execute function public.v3_fault();""")
sql(v2call(c),fail='v3_injected');assert v2total(c)==0
assert sql("select count(*) from arena.submission_attempts where round_id="+literal(v2stage(c,1)['round_id']))=='0'
sql('drop trigger v3_fault on arena.submission_attempts; drop function public.v3_fault();')
parallel([v2call(c)]*8);assert v2total(c)==100
v3close(c);sql(v2call(c,key='late'),fail='inactive_challenge')
invariant()
# All existing V2 races still execute before this patch; explicit V3 independent-team overlap.
c=v2fixture(2);v2control(c,'start_stage',1)
with futures.ThreadPoolExecutor() as pool:
 holder=pool.submit(sql,'begin; '+v2call(c)+'; select pg_sleep(.5); commit;',None,'v3-independent')
 wait_sleep('v3-independent');sql(v2call(c,team=1));assert not holder.done();holder.result()
assert [v2total(c,team=i) for i in range(2)]==[100,100]
print('PASS V3 transaction rollback, concurrent retry, close rejection, independent-team progress')

# Submission vs MC close/finalize and recovery revocation: actual overlapping connections.
for first_submission in [True,False]:
 for repetition in range(3):
  c=v2fixture();v2control(c,'start_stage',1)
  for _ in range(3):v3expire(c);v3advance(c)
  close=f"select arena.competition_control('{c['competitionId']}','{V2_HASH}','close_challenge',1,null,3)"
  end=f"select arena.competition_control('{c['competitionId']}','{V2_HASH}','finalize_stage',1)"
  if first_submission:
   overlap(v2call(c,item='navigation'),close+';'+end);assert v2total(c)==100
  else:
   v3expire(c);overlap(close+';'+end,v2call(c,item='navigation'),'stage_closed');assert v2total(c)==0
  invariant()
  c=v2fixture();v2control(c,'start_stage',1)
  req=v2rpc('request_competition_recovery',[c['competitionId'],c['teams'][0]['competitionTeamId'],'5'*64])
  revoke=f"select arena.competition_control('{c['competitionId']}','{V2_HASH}','approve_recovery',null,null,null,'{req}')"
  if first_submission:
   overlap(v2call(c),revoke);assert v2total(c)==100
  else:
   overlap(revoke,v2call(c),'forbidden');assert v2total(c)==0
  invariant()
print('PASS V3 close/finalize and token revocation races in both lock orders, three repetitions')

# Repeat all three transactional fault boundaries after the V3 function replacement.
sql("""create function public.v3_boundary() returns trigger language plpgsql as $$ begin if current_setting('arena.v3_fault',true)=TG_ARGV[0] then raise exception 'v3_boundary'; end if; return new; end $$;
create trigger v3_before before insert on arena.submission_attempts for each row execute function public.v3_boundary('validation');
create trigger v3_after after insert on arena.submission_attempts for each row execute function public.v3_boundary('attempt');
create trigger v3_aggregate before insert on arena.team_scores for each row execute function public.v3_boundary('aggregate');""")
for phase in ['validation','attempt','aggregate']:
 c=v2fixture();v2control(c,'start_stage',1)
 sql("set arena.v3_fault="+literal(phase)+"; "+v2call(c),fail='v3_boundary')
 assert v2total(c)==0
 assert sql("select count(*) from arena.submission_attempts where round_id="+literal(v2stage(c,1)['round_id']))=='0'
 parallel([v2call(c)]*4);assert v2total(c)==100;invariant()
sql('drop trigger v3_before on arena.submission_attempts; drop trigger v3_after on arena.submission_attempts; drop trigger v3_aggregate on arena.team_scores; drop function public.v3_boundary();')
print('PASS V3 validation/attempt/aggregate fault rollback and concurrent retries recover once')
sql((ROOT/'supabase/verification-competition-v3.sql').read_text())

for role in ['anon','authenticated']:
 assert sql(f"select has_schema_privilege('{role}','arena','usage')")=='f'
 assert sql(f"select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and has_function_privilege('{role}',p.oid,'execute')")=='0'
assert sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and (p.prosecdef or p.proconfig is distinct from ARRAY['search_path=pg_catalog'])")=='0'
assert before_v3==fingerprint()
assert sql("select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock'")=='0'
# Guarded rollback on an isolated clone, including original function body restoration.
archive=Path('/tmp')/f'arena-v3-{uuid.uuid4()}.dump';original_db=os.environ['PGDATABASE']
try:
 subprocess.run(['pg_dump','-Fc','-f',str(archive)],check=True,capture_output=True)
 subprocess.run(['createdb','restored_arena_v3'],check=True,capture_output=True)
 subprocess.run(['pg_restore','--exit-on-error','--dbname','restored_arena_v3',str(archive)],check=True,capture_output=True)
 os.environ['PGDATABASE']='restored_arena_v3'
 sql(v3rollback.read_text(),fail='V3 rollback requires reviewed-backup')
 sql("set arena.confirm_v3_rollback='reviewed-backup';"+v3rollback.read_text(),fail='no active stages')
 # Test-only maintenance fixture finalizes remaining active stages first.
 sql("update arena.competition_stages set status='finalized' where status='active'")
 sql("set arena.confirm_v3_rollback='reviewed-backup';"+v3rollback.read_text())
 assert sql("select count(*) from information_schema.columns where table_schema='arena' and column_name='item_deadline_at'")=='0'
 assert function_hashes==sql("select md5(string_agg(pg_get_functiondef(p.oid), E'\\n' order by p.proname)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and p.proname in ('join_competition','competition_control','process_submission','competition_state','freeze_competition_stage')")
 migration(v3path)
 assert portable_before==portable_website_fingerprint()
finally:
 os.environ['PGDATABASE']=original_db;archive.unlink(missing_ok=True)
print('PASS V3 browser denial, fixed invoker search paths, website isolation, no lock waits, dump/restore, guarded rollback and reapply')
