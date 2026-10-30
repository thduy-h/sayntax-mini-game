#!/usr/bin/env python3
"""Copy original SQL and reviewed Arena assets into a fresh local-only checkout."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--main-repo', type=Path, default=Path('/home/thduy-h/Documents/TD/SAYNTAX'))
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
originals = [args.main_repo / 'supabase/migrations' / name for name in (
    '20260309184500_initial_schema.sql', '20260412000000_lesson_v2_progress.sql')]
sources = originals + [root / 'supabase/migrations' / name for name in ('20261030100000_arena_schema.sql', '20261030165721_arena_competition_v2.sql', '20261031010000_arena_competition_v3.sql')]
for source in sources:
    if not source.is_file() or not source.stat().st_size:
        raise SystemExit(f'Missing or empty original SQL: {source}')
out = Path(tempfile.mkdtemp(prefix='sayntax-arena-deploy-'))
(out / 'supabase/migrations').mkdir(parents=True)
manifest = []
for source in sources:
    target = out / 'supabase/migrations' / source.name
    shutil.copy2(source, target)
    if source.read_bytes() != target.read_bytes():
        raise SystemExit(f'Copy verification failed: {source.name}')
    manifest.append(dict(name=source.name, source=str(source), sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
for directory in ('functions', 'rollback'):
    shutil.copytree(root / 'supabase' / directory, out / 'supabase' / directory,
                    ignore=shutil.ignore_patterns('.env', '.env.*', '__pycache__'))
for name in ('verification.sql', 'verification-competition-v2.sql', 'verification-competition-v3.sql', 'preflight-readonly.sql'):
    shutil.copy2(root / 'supabase' / name, out / 'supabase' / name)
functions = sorted(p.name for p in (out / 'supabase/functions').glob('arena-*') if p.is_dir())
config = 'project_id = "sayntax-arena-deployment"\n\n'
config += '\n'.join(f'[functions.{name}]\nverify_jwt = true\n' for name in functions)
(out / 'supabase/config.toml').write_text(config)
(out / 'migration-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
(out / '.gitignore').write_text('supabase/.temp/\n.env*\nbackups/\n')
print(out)
print('Local copies verified by SHA-256; no remote commands executed.')
for item in manifest:
    print(item['name'], item['sha256'])
