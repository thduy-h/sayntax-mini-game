# Phase 0 verification log

Commit: `bd64e77db900d0c76f5a1bd873cb2e241a6465fc`; branch and `origin/main` matched; initial `git status --short` empty. Local Node `v22.23.3`, npm `10.9.9`, Python `3.11.16`. No dependencies installed or upgraded. `.env.local` was present but values were not read or printed.

| Command | Exit | Observed result |
|---|---:|---|
| `npm test` | 1 | Auth role, intent display, voice cursor, demo progress and package block/lesson/parser tests passed. Web sequence stopped at `voice-command-input.test.ts`: `Cannot find module '@shecancode/voice-parser'`. Later web tests and root operations/seed mapping tests did not run. No flaky rerun attempted. |
| `npm run typecheck` | 1 | Web TS2307 on `@shecancode/*` package imports and cascading implicit-any errors; other workspace typecheck scripts ran. Npm lifecycle exits 1. |
| `npm run lint` | 0 | ESLint completed without output/warnings. |
| `npm run build` | 1 | Next 16.1.6 compiled in 19.8s; warning/notice: experimental `proxyClientMaxBodySize: "11mb"`; TypeScript failed at `app/api/program-runs/route.ts:2` resolving `@shecancode/lesson-engine`. No route list printed. |
| Python AST parse | 0 | Seven `asr-server/app/*.py` modules parsed without writing bytecode. |
| Python dependency presence | 0 | `fastapi`, `faster_whisper`, `pydantic`, `multipart` all absent from current interpreter; ASR imports and endpoint tests not run. No model downloaded. |

## Test inventory and gaps

| Category | Present | Coverage and critical gaps |
|---|---|---|
| Parser unit | Yes: 3 files | Deterministic parsing, normalization, alternative ranking; no live audio/browser chain. |
| Lesson engine | Yes: 2 files plus seed mapping script | Actions and V2 seed; root seed mapping script skipped by failed npm test. |
| Block engine | Yes: 1 file | Core execution; malformed Blockly serialization and large workspace browser behavior unverified. |
| Frontend utility/contract | Yes: lesson V2 utilities, global voice routing/control, ASR filter/proxy, operations contract | Pure utility behavior; no full rendered lesson journey. Several were skipped when web script stopped. |
| Auth | Limited: `roles.test.ts` | Role helper only; signup, login, logout, callback, expiry, direct URLs, admin provisioning/RLS absent. |
| API route | Limited: ASR proxy and operations contract tests | No full database route request tests for programs/runs/progress/voice logs. |
| Database/RLS | Seed mapping static test only | No live SQL migration, FK, RLS, role-escalation test. |
| ASR | Python `tests/test_upload.py` exists; JS ASR proxy tests exist | Python tests unavailable without dependencies; no model inference, concurrency or network smoke. |
| Integration | Release smoke scripts exist | Not run: need staging URL/session. No authenticated end-to-end result. |
| Browser/E2E | Absent | Guest/auth/admin flows, refresh/back/forward, voice fallback, destructive confirmation, concurrent saves absent. |
| Automated accessibility | Absent | Keyboard, screen reader, target and zoom checks require manual/browser coverage. |

Source checks: FastAPI does cap full multipart at configured 10 MiB + 64 KiB and file at 10 MiB, including chunked uploads. Allowed MIME list and temp-file cleanup are present. `main.py` route registration appears incorrect and needs endpoint verification after dependencies are available. Model startup calls `get_model()` and would download/load weights; intentionally not run. No live Supabase, Vercel, Groq, browser, HTTPS or staging checks were performed. Runtime warnings, skips, and route list are limited to the output above.
