"""Real parallel psql connections, disposable local cluster only. No HTTP mocks."""
import concurrent.futures as futures
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
assert os.environ['PGHOST'] == '127.0.0.1'

def sql(statement, fail=None, app='arena-test'):
    p = subprocess.run(['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], input=statement,
                       text=True, capture_output=True, env={**os.environ, 'PGAPPNAME': app})
    if fail:
        assert p.returncode and fail in p.stderr, (fail, p.stdout, p.stderr)
    else:
        assert p.returncode == 0, p.stderr
    return p.stdout.strip()

def literal(value):
    return "'" + str(value).replace("'", "''") + "'"

def parallel(statements):
    with futures.ThreadPoolExecutor(max_workers=16) as pool:
        return list(pool.map(sql, statements))

def wait_sleep(app):
    for _ in range(200):
        if sql("select count(*) from pg_stat_activity where application_name=" + literal(app) + " and wait_event='PgSleep'") == '1':
            return
        time.sleep(.01)
    raise AssertionError('deterministic overlap barrier not reached: ' + app)

def overlap(first, second, second_error=None):
    with futures.ThreadPoolExecutor() as pool:
        running = pool.submit(sql, 'begin; ' + first + '; select pg_sleep(0.3); commit;', None, 'arena-holder')
        wait_sleep('arena-holder')
        result = sql(second, fail=second_error)
        running.result()
        return result

def migration(path):
    sql(path.read_text())

sql('create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;')
print('Database:', sql('show server_version'))

if '--regression' in sys.argv:
    assert hashlib.sha256((ROOT / 'tests/database/arena-pre-atomic-regression.sql').read_bytes()).hexdigest() == '63795dc55b91fc34bd11bc2b43833c3c5ec1e1e3717011d11a62a382d262d815'
    migration(ROOT / 'tests/database/arena-pre-atomic-regression.sql')
    sql("""insert into arena.rooms(id,code,mc_token_hash) values('00000000-0000-0000-0000-000000000001','TEST24','test');
    insert into arena.teams(id,room_id,name,join_token_hash) values('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Team','test');
    insert into arena.rounds(id,room_id,game,status,config,content_version) values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','accessibility','running','{}','test');""")
    def old_insert(item):
        return "insert into arena.submissions(round_id,team_id,item_id,idempotency_key,payload,verified_score,verified) values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002'," + literal(item) + ',' + literal(item) + ",'{}',100,true)"
    overlap(old_insert('contrast'), old_insert('keyboard'))
    expected = sql('select sum(verified_score) from arena.submissions where verified')
    observed = sql('select sum(score) from arena.team_scores')
    print(f'Baseline regression assertion: canonical={expected}, leaderboard={observed}', flush=True)
    assert expected == observed, 'REGRESSION: stale aggregate loses a concurrent different-item score'
    sys.exit(0)

# Original website migrations unmodified; minimal Auth API fixture, NOT hosted Auth.
sql("""create schema auth;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
""")
for name in ['20260309184500_initial_schema.sql', '20260412000000_lesson_v2_progress.sql']:
    migration(ROOT.parent / 'SAYNTAX/supabase/migrations' / name)

def fingerprint():
    return sql("""select md5(string_agg(v,E'\\n' order by v)) from (
      select 'table:'||c.oid::text||':'||c.relname||':'||c.relrowsecurity||':'||coalesce(c.relacl::text,'') v
        from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth')
      union all select 'policy:'||row_to_json(p)::text from pg_policies p where schemaname in ('public','auth')
      union all select 'function:'||pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','auth')
      union all select 'trigger:'||pg_get_triggerdef(t.oid) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth')
    ) s""")
sql("insert into auth.users(id,email) values('50000000-0000-0000-0000-000000000001','synthetic@example.invalid')")
assert sql('select count(*) from public.users') == '1'
website_before = fingerprint()
migration(ROOT / 'supabase/migrations/20261030100000_arena_schema.sql')
assert website_before == fingerprint()
print('PASS original website migrations + Arena: public/Auth fingerprints unchanged')

R = '10000000-0000-0000-0000-000000000001'
RD = '20000000-0000-0000-0000-000000000001'
TEAMS = [f'30000000-0000-0000-0000-{n:012d}' for n in range(1, 9)]
CONFIG = {'scenarioIds': ['contrast', 'keyboard', 'captions', 'language']}
GAME = 'accessibility'

def fixture(game='accessibility'):
    global GAME, CONFIG
    GAME = game
    CONFIG = {'scenarioIds': ['contrast', 'keyboard', 'captions', 'language']} if game == 'accessibility' else {'levelIds': ['1', '2'], 'levels': {'1': {'par': 4}, '2': {'par': 9}}}
    sql('truncate arena.rooms cascade;')
    sql(f"insert into arena.rooms(id,code,mc_token_hash) values('{R}','TEST24','mc');")
    parallel([f"set role service_role; insert into arena.teams(id,room_id,name,join_token_hash) values('{team}','{R}','Team {n}','token{n}')" for n, team in enumerate(TEAMS)])
    sql(f"insert into arena.teams(room_id,name,join_token_hash) values('{R}','Ninth','no')", fail='room_team_limit_reached')
    sql(f"update arena.rooms set status='running' where id='{R}'; insert into arena.rounds(id,room_id,game,status,config,content_version,started_at) values('{RD}','{R}','{game}','running',{literal(json.dumps(CONFIG))},'2026-10-29',now());")

def call(item='contrast', key=None, score=100, successful=True, team=0, token=None, payload=None, config=None, version='2026-10-29'):
    key = key or str(uuid.uuid4())
    payload = payload if payload is not None else {'answerId': 'best'} if GAME == 'accessibility' else {'commands': ['forward']}
    args = [RD, TEAMS[team], token or f'token{team}', GAME, item, key, json.dumps(payload)]
    values = [literal(v) for v in args] + ['true' if successful else 'false', str(score), literal(version), literal(json.dumps(config if config is not None else CONFIG))]
    return 'select arena.process_submission(' + ','.join(values) + ')'

def invoke(**args):
    return json.loads(sql('set role service_role; ' + call(**args)))

def total(team=0):
    return int(sql(f"select coalesce((select score from arena.team_scores where round_id='{RD}' and team_id='{TEAMS[team]}'),0)"))

def invariant():
    assert sql("""with expected as (select round_id,team_id,sum(verified_score) filter(where verified) score from arena.submissions group by 1,2)
    select count(*) from expected e full join arena.team_scores s using(round_id,team_id) where coalesce(e.score,0) <> coalesce(s.score,0)""") == '0'
    assert sql('select count(*) from arena.submission_attempts where response is null') == '0'

# Nine genuinely concurrent joins: exactly eight admitted, expected limit only swallowed.
sql("insert into arena.rooms(code,mc_token_hash) values('LIMIT2','mc')")
parallel([f"set role service_role; do $$ begin insert into arena.teams(room_id,name,join_token_hash) select id,'Team {i}','token' from arena.rooms where code='LIMIT2'; exception when others then if sqlerrm <> 'room_team_limit_reached' then raise; end if; end $$;" for i in range(9)])
assert sql("select count(*) from arena.teams t join arena.rooms r on r.id=t.room_id where r.code='LIMIT2'") == '8'
assert sql("set role service_role; select count(*) from generate_series(1,6) where arena.consume_rate_limit('integration-limit',5,60)") == '5'
print('PASS nine concurrent joins admit exactly eight; rate-limit budget enforced')

# Test trigger itself with independent writes: RPC team locks must not mask a stale SUM.
fixture()
def direct(item):
    return f"insert into arena.submissions(round_id,team_id,item_id,idempotency_key,payload,verified_score,verified) values('{RD}','{TEAMS[0]}','{item}','{item}','{{}}',100,true)"
overlap(direct('contrast'), direct('keyboard'))
assert total() == 200
sql(f"update arena.submissions set verified_score=20 where item_id='contrast'; update arena.submissions set verified=false where item_id='keyboard'")
assert total() == 20
invariant()
print('PASS independent trigger regression: canonical=200 leaderboard=200; downward/verification deltas consistent')

REPEATS = int(os.environ.get('ARENA_CONCURRENCY_REPEATS', '10'))
for repeat in range(REPEATS):
    fixture()
    parallel(['set role service_role; ' + call(item=item) for item in CONFIG['scenarioIds'][:2]])
    assert total() == 200
    invariant()
    fixture()
    parallel(['set role service_role; ' + call(item=item) for item in CONFIG['scenarioIds']])
    assert total() == 400
    invariant()
    fixture()
    parallel(['set role service_role; ' + call(key='same') for _ in range(8)])
    assert total() == 100 and sql('select count(*) from arena.submission_attempts') == '1'
    invariant()
    parallel(['set role service_role; ' + call() for _ in range(8)])
    assert total() == 100 and sql('select count(*) from arena.submissions') == '1'
    invariant()
    fixture('robot')
    parallel(['set role service_role; ' + call(item='1', score=s) for s in [100, 140, 212, 320, 302, 284]])
    assert total() == 320 and sql('select count(*) from arena.submissions') == '1'
    invariant()
    failed = invoke(item='2', key='failure', score=0, successful=False)
    assert failed['verified'] is False and total() == 320
    assert invoke(item='2', key='failure', score=0, successful=False)['duplicate'] is True
    invoke(item='2', score=284)
    assert total() == 604
    invariant()
    fixture()
    parallel(['set role service_role; ' + call(item=item, team=team, key=f'key-{item}') for team in range(8) for item in CONFIG['scenarioIds']])
    assert [total(team) for team in range(8)] == [400]*8
    invariant()
print(f'PASS {REPEATS} repeats: 2-item=200, 4-item=400, same/different keys, best Robot retry, failed Robot=0, 8-team isolation')

fixture()
invoke(score=20, payload={'answerId': 'icon'})
assert invoke(score=100, payload={'answerId': 'contrast'})['submission']['verified_score'] == 20
assert total() == 20
invariant()
fixture()
sql(call(team=1, token='token0'), fail='forbidden')
foreign_team = '40000000-0000-0000-0000-000000000001'
sql(f"insert into arena.rooms(code,mc_token_hash) values('OTHER2','other'); insert into arena.teams(id,room_id,name,join_token_hash) select '{foreign_team}',id,'Foreign','token0' from arena.rooms where code='OTHER2'")
sql(call().replace(TEAMS[0],foreign_team), fail='forbidden')
assert sql('select count(*) from arena.submission_attempts') == '0'
invariant()
print('PASS first partial answer stays locked; cross-team token and cross-room membership denied')
fixture()
first = invoke(key='stable')
invoke(item='keyboard')
assert invoke(key='stable') == {**first, 'duplicate': True}
sql(call(key='stable', payload={'answerId': 'changed'}), fail='invalid_idempotency_reuse')
sql(call(token='wrong'), fail='forbidden')
sql(call(item='missing'), fail='item_not_in_round')
sql(call(config={}), fail='round_content_mismatch')
sql(call(version='wrong'), fail='round_content_mismatch')
sql(call(score=99999), fail='invalid_verified_submission')
sql(f"update arena.rounds set config='{{}}' where id='{RD}'", fail='active_round_configuration_is_immutable')
invariant()
# A held submission for team 0 must not block team 1 (room/round SHARE).
fixture()
with futures.ThreadPoolExecutor() as pool:
    held = pool.submit(sql, 'begin; set role service_role; '+call(team=0)+'; select pg_sleep(1); commit;', None, 'arena-holder')
    wait_sleep('arena-holder')
    assert invoke(team=1)['score'] == 100
    assert not held.done(), 'different teams were unnecessarily serialized'
    held.result()
invariant()
print('PASS independent team submission completes while another team holds submission locks')
print('PASS stable idempotent result, payload reuse rejection, token/config/version/item/score validation')

for action in ['end_round', 'revoke_team']:
    admin = f"select arena.apply_room_action('{R}','{action}'," + (f"'{TEAMS[0]}'" if action == 'revoke_team' else 'null') + ",'mc')"
    for _ in range(3):
        fixture()
        overlap('set role service_role; '+call(), 'set role service_role; '+admin)
        assert total() == 100
        sql(call(item='keyboard'), fail='forbidden' if action == 'revoke_team' else 'round_not_running')
        assert sql('select count(*) from arena.submission_attempts') == '1'
        invariant()
        fixture()
        overlap('set role service_role; '+admin, 'set role service_role; '+call(), 'forbidden' if action == 'revoke_team' else 'round_not_running')
        assert total() == 0 and sql('select count(*) from arena.submission_attempts') == '0'
        invariant()
print('PASS end-round and revocation races: both forced serialization orders, 3 repeats each')

fixture()
sql(f"update arena.teams set token_expires_at=now()-interval '1 second' where id='{TEAMS[0]}'")
sql(call(), fail='forbidden')
fixture()
# Token expires during a lock wait: validation must use wall-clock after the wait.
sql(f"update arena.teams set token_expires_at=clock_timestamp()+interval '0.15 seconds' where id='{TEAMS[0]}'")
overlap(f"select id from arena.teams where id='{TEAMS[0]}' for update", call(), 'forbidden')
assert total() == 0
fixture()
sql(f"update arena.rooms set expires_at=now()-interval '1 second' where id='{R}'")
sql(call(), fail='round_not_running')
invariant()
print('PASS expired room/token, including expiry while waiting for team lock')

# Test-only hooks, never in migration: fault injection at database statement boundaries.
sql("""create function public.arena_test_fault() returns trigger language plpgsql as $$ begin
 if current_setting('arena.test_fault',true) = TG_ARGV[0] then raise exception 'injected_failure'; end if;
 return new; end $$;
create trigger fault_before_attempt before insert on arena.submission_attempts for each row execute function public.arena_test_fault('after_validation');
create trigger fault_after_attempt after insert on arena.submission_attempts for each row execute function public.arena_test_fault('after_attempt');
create trigger fault_before_aggregate before insert on arena.team_scores for each row execute function public.arena_test_fault('before_aggregate');
""")
for phase in ['after_validation', 'after_attempt', 'before_aggregate']:
    fixture()
    sql(f"begin; set local arena.test_fault='{phase}'; set local role service_role; " + call(key=phase) + '; commit;', fail='injected_failure')
    assert total() == 0
    assert sql('select count(*) from arena.submission_attempts') == '0'
    assert sql('select count(*) from arena.submissions') == '0'
    invoke(key=phase)
    invoke(key=phase)
    assert total() == 100
    invariant()
fixture()
# First transaction inserts successfully, then errors while competitors wait.
with futures.ThreadPoolExecutor() as pool:
    pending = pool.submit(sql, 'begin; set role service_role; '+call(key='recover')+"; select pg_sleep(0.3); select 1/0; commit;", 'division by zero', 'arena-holder')
    wait_sleep('arena-holder')
    retried = invoke(key='recover')
    pending.result()
assert retried['score'] == 100 and sql('select count(*) from arena.submission_attempts') == '1'
invariant()
sql('drop trigger fault_before_attempt on arena.submission_attempts; drop trigger fault_after_attempt on arena.submission_attempts; drop trigger fault_before_aggregate on arena.team_scores; drop function public.arena_test_fault();')
print('PASS fault injection: validation/attempt/aggregate boundaries and competing aborted transaction; retry recovers exactly once')

# MC credentials must also be checked inside the room-lock transaction.
fixture()
sql(f"select arena.apply_room_action('{R}','end_round',null,'wrong')", fail='forbidden')
sql(f"select arena.apply_room_action('{R}','end_round',null,'mc')")
sql(f"select arena.start_round('{R}','accessibility','{{\"scenarioIds\":[\"contrast\"]}}','2026-10-29','wrong')", fail='forbidden')
sql(f"select arena.start_round('{R}','accessibility','{{\"scenarioIds\":[\"contrast\"]}}','2026-10-29','mc')")
sql(f"select arena.start_round('{R}','accessibility','{{}}','2026-10-29','mc')", fail='room_not_locked')
sql(f"select arena.apply_room_action('{R}','end_round',null,'mc')")
start = f"do $$ begin perform arena.start_round('{R}','accessibility','{{\"scenarioIds\":[\"contrast\"]}}','2026-10-29','mc'); exception when others then if sqlerrm <> 'room_not_locked' then raise; end if; end $$;"
parallel([start, start])
assert sql("select count(*) from arena.rounds where status='running'") == '1'
print('PASS transactional MC credential separation and concurrent round start/end')

assert sql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='arena' and c.relkind='r' and not c.relrowsecurity") == '0'
for role in ['anon', 'authenticated']:
    assert sql(f"select has_schema_privilege('{role}','arena','usage')") == 'f'
    assert sql(f"select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and has_function_privilege('{role}',p.oid,'execute')") == '0'
    assert sql(f"select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='arena' and c.relkind='r' and has_table_privilege('{role}',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')") == '0'
    sql(f'set role {role}; '+call(), fail='permission denied')
assert sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and (p.prosecdef or p.proconfig is distinct from ARRAY['search_path=pg_catalog'])") == '0'
assert sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='arena' and has_function_privilege('service_role',p.oid,'execute')") == '5'
assert sql("select count(*) from pg_tables where schemaname='arena'") == '7'
assert sql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='arena' and c.relkind='r' and has_table_privilege('service_role',c.oid,'DELETE,TRUNCATE,REFERENCES,TRIGGER')") == '0'
assert website_before == fingerprint()
sql((ROOT / 'supabase/verification.sql').read_text())
print('PASS RLS all tables; browser schema/table/RPC denial; invoker-only functions; restricted service grants; website unchanged')
invariant()
# Recovery: synthetic DB with actual website DDL + nonempty Arena data, no real user data.
fixture()
invoke(key='restore-a')
invoke(item='keyboard',key='restore-b')
assert total() == 200
invariant()
saved_counts = sql('select (select count(*) from arena.submissions),(select count(*) from arena.submission_attempts),(select count(*) from public.users)')
archive = Path(os.environ.get('TMPDIR', '/tmp')) / f'arena-tx-recovery-{os.getpid()}.dump'
try:
    subprocess.run(['pg_dump', '--format=custom', '--file', str(archive)], check=True)
    subprocess.run(['createdb', 'arena_restored'], check=True)
    subprocess.run(['pg_restore', '--exit-on-error', '--single-transaction', '-d', 'arena_restored', str(archive)], check=True)
    original_db = os.environ['PGDATABASE']
    os.environ['PGDATABASE'] = 'arena_restored'
    invariant()
    assert saved_counts == sql('select (select count(*) from arena.submissions),(select count(*) from arena.submission_attempts),(select count(*) from public.users)')
    assert total() == 200
    assert sql("select has_schema_privilege('anon','arena','usage')") == 'f'
    sql((ROOT / 'supabase/rollback/20261030100000_arena_schema.rollback.sql').read_text())
    assert sql("select to_regnamespace('arena') is null") == 't'
    assert sql("select count(*) from pg_tables where schemaname='public'") == '13'
    assert sql('select count(*) from public.users') == '1'
    print('PASS custom-format dump/restore, canonical totals, row recovery, browser denial and Arena rollback preserving 13 website tables')
    os.environ['PGDATABASE'] = original_db
finally:
    archive.unlink(missing_ok=True)

assert sql("select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock'") == '0'
print('PASS all local transaction integration assertions; no unresolved lock waits; no production connection used')

if '--competition' in sys.argv:
    exec((ROOT / 'tests/database/competition.py').read_text())

if any(flag in sys.argv for flag in ['--competition-v3', '--state-projection', '--a11y-display', '--competition-v5']):
    exec((ROOT / 'tests/database/competition.py').read_text())
    exec((ROOT / 'tests/database/competition_v3.py').read_text())

if '--state-projection' in sys.argv:
    exec((ROOT / 'tests/database/state_projection.py').read_text())

if "--a11y-display" in sys.argv or "--competition-v5" in sys.argv:
    exec((ROOT / "tests/database/a11y_display.py").read_text())

if "--competition-v5" in sys.argv:
    exec((ROOT / "tests/database/competition_v5.py").read_text())

if "--competition-v5" in sys.argv:
    exec((ROOT / "tests/database/colorblind_sync.py").read_text())

if "--competition-v5" in sys.argv:
    exec((ROOT / "tests/database/robot_run_only.py").read_text())
