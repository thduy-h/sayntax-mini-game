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
parser.add_argument('--function-source', type=Path, help='Explicit reviewed function directory; use the deployed 4/3 hotfix bundle for this release')
parser.add_argument('--a11y-display', action='store_true', help='Include only the reviewed cross-device BEFORE/AFTER patch after deployed V3')
parser.add_argument('--run-only', action='store_true', help='Include pending local-only Robot execution correction; implies vision and V5')
parser.add_argument('--vision', action='store_true', help='Include deployed MC color-vision synchronization after V5')
parser.add_argument('--v5', action='store_true', help='Prepare V5 with pending display sync, excluding superseded V4/QR/state drafts')
args = parser.parse_args()
if args.run_only:
    args.vision = True
if args.vision:
    args.v5 = True
if args.v5:
    args.a11y_display = True
if args.a11y_display and not args.function_source:
    parser.error('--a11y-display requires --function-source pointing to the reviewed production-compatible bundle')
root = Path(__file__).resolve().parents[1]
originals = [args.main_repo / 'supabase/migrations' / name for name in (
    '20260309184500_initial_schema.sql', '20260412000000_lesson_v2_progress.sql')]
sources = originals + [root / 'supabase/migrations' / name for name in ('20261030100000_arena_schema.sql', '20261030165721_arena_competition_v2.sql', '20261031010000_arena_competition_v3.sql')]
if args.a11y_display:
    sources.append(root / 'supabase/migrations/20261101020000_arena_a11y_display_sync.sql')
if args.v5:
    sources.append(root / 'supabase/migrations/20261101030000_arena_competition_v5.sql')
if args.vision:
    sources.append(root / 'supabase/migrations/20261101040000_arena_colorblind_sync.sql')
if args.run_only:
    sources.append(root / 'supabase/migrations/20261101050000_arena_robot_run_only.sql')
for source in sources:
    if not source.is_file() or not source.stat().st_size:
        raise SystemExit(f'Missing or empty original SQL: {source}')
out = Path(tempfile.mkdtemp(prefix='sayntax-arena-deploy-'))
(out / 'supabase/migrations').mkdir(parents=True)
manifest = []
for source in sources:
    # MCP assigned this actual deployment version; never apply the same V3 SQL twice.
    target_name = {
        '20261031010000_arena_competition_v3.sql': '20261031191004_arena_competition_v3_sync_hotfix.sql',
        '20261101020000_arena_a11y_display_sync.sql': '20261031201122_arena_a11y_display_sync.sql',
        '20261101030000_arena_competition_v5.sql': '20261031201129_arena_competition_v5.sql',
        '20261101040000_arena_colorblind_sync.sql': '20261031203037_arena_colorblind_sync.sql',
    }.get(source.name, source.name)
    target = out / 'supabase/migrations' / target_name
    shutil.copy2(source, target)
    if source.read_bytes() != target.read_bytes():
        raise SystemExit(f'Copy verification failed: {source.name}')
    manifest.append(dict(name=target.name, source=str(source), sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
for directory in ('functions', 'rollback'):
    reviewed_source = args.function_source if directory == 'functions' and args.function_source else root / 'supabase' / directory
    shutil.copytree(reviewed_source, out / 'supabase' / directory,
                    ignore=shutil.ignore_patterns('.env', '.env.*', '__pycache__'))
for name in ('verification-competition-v5.sql', 'verification-a11y-display.sql', 'verification.sql', 'verification-competition-v2.sql', 'verification-competition-v3.sql', 'preflight-readonly.sql'):
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
