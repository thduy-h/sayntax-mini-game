"""Focused V5 iteration runner. Local disposable PG only; full suite separately."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
s=(ROOT/'tests/database/transactions.py').read_text()
exec(s[:s.index("sql('create role anon")])
sql('create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;')
sql('create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb); create function auth.uid() returns uuid language sql as $$ select null::uuid $$;')
for n in ['20260309184500_initial_schema.sql','20260412000000_lesson_v2_progress.sql']:
 migration(ROOT.parent/'SAYNTAX/supabase/migrations'/n)
a=s.index('def fingerprint():');b=s.index('sql("insert into auth.users',a);exec(s[a:b])
for n in ['20261030100000_arena_schema.sql','20261030165721_arena_competition_v2.sql','20261031010000_arena_competition_v3.sql','20261101020000_arena_a11y_display_sync.sql']:
 migration(ROOT/'supabase/migrations'/n)
s=(ROOT/'tests/database/competition.py').read_text();exec(s[s.index("V2_HASH ="):s.index('c=v2fixture(0)')])
s=(ROOT/'tests/database/competition_v3.py').read_text();exec(s[s.index('def v3close'):s.index('for repeat in range(6)')])
def invariant():
 assert sql('select count(*) from (select round_id,team_id,sum(verified_score) score from arena.submissions where verified group by 1,2) a full join arena.team_scores b using(round_id,team_id) where coalesce(a.score,0)<>coalesce(b.score,0)')=='0'
print('Focused database:',sql('show server_version'),flush=True)
exec((ROOT/'tests/database/competition_v5.py').read_text())
