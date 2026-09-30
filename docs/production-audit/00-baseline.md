# Phase 0 baseline

Snapshot: `main` at `bd64e77db900d0c76f5a1bd873cb2e241a6465fc`; `origin/main` matched; working tree was clean before audit. This is a source audit. Deployed Supabase, Vercel, Groq, and workshop ASR were not exercised.

## Architecture and release surface

Next.js 16 App Router, React 19, TypeScript, npm workspaces, Blockly 12, Supabase SSR/Auth/Postgres, code-seeded Lesson V2, deterministic Vietnamese parser, same-origin ASR proxy with Groq cloud or local FastAPI upstream and Web Speech fallback. `README.md` explicitly describes cloud ASR for production, differing from the local-ASR-only task context. Five lessons and 25 steps are stated; source seed is in `packages/lesson-engine/src/seed-v2.ts`. Public `/`, `/demo`, `/demo/[slug]`; account `/sign-in`, `/sign-up`, `/auth/callback`, `/onboarding`, `/dashboard`, `/lessons-v2`, `/lessons-v2/[slug]`; protected `/admin`; API `/api/asr/transcribe`, `/api/programs`, `/api/program-runs`, `/api/progress`, `/api/voice-command-logs`. A production route list was not printed because build failed at type checking.

`vercel.json` expects repository root, `npm install`, `npm run build --workspace @shecancode/web`, output `apps/web/.next`. CI exists in `.github/workflows/ci.yml` and uses Node 22, npm 11, `npm ci`, lint, typecheck, test, build. Local npm was 10.9.9 although root `package.json` requests npm >=11. Lockfile v3 exists. Runtime dependencies use exact Next/React versions and caret ranges for many others; lockfile constrains resolved npm versions. Python direct packages are pinned in `asr-server/requirements.txt`, transitive Python packages are not locked. Vercel production/preview env and remote CI status were not inspected.

## Data and trust boundaries

`apps/web/proxy.ts` refreshes Supabase cookies on non-public routes; route/page handlers also use `auth.getUser()`. Missing Supabase env lets public demo render, while authenticated API access fails closed. Signup checks an email allowlist before a service-role update for admin; `ADMIN_EMAILS`, `ADMIN_ALLOWLIST_EMAILS`, and `NEXT_PUBLIC_ADMIN_EMAILS` all contribute. The last is browser-exposed configuration, though role enforcement reads DB role. Admin page checks DB role before queries; RLS `is_admin()` reads `public.users`. Callback redirects to fixed `/onboarding`; sign-in callback path rejects non-root and `//` paths, with route authorization still applied. Expiry and refresh need browser testing.

Initial SQL migration enables RLS on 12 tables: users, student_profiles, accessibility_settings, courses, lessons, lesson_steps, programs, program_runs, progress, confidence_checkins, voice_command_logs, role_model_entries. V2 migration enables it on lesson_v2_progress. Personal tables generally allow owner SELECT and INSERT/UPDATE as applicable plus admin SELECT; no DELETE policies are present. Content tables allow published SELECT and admin management. `is_admin` and auth-user trigger functions are SECURITY DEFINER with `search_path=public`; `prevent_role_escalation` blocks self role changes unless already admin. Reset-policies script drops initial policies only and is an operator repair script, not an application route. Actual deployed policies and grants are unverified.

V2 step completion is isolated in `lesson_v2_progress` by slug/text step ID. Legacy `progress`, `programs`, `program_runs`, and `voice_command_logs` retain FKs to V1 `lessons`/`lesson_steps`. `supabase/seed.sql` includes hidden V2 UUID reference rows to satisfy those FKs; `scripts/lesson-seed-mapping.test.ts` checks mapping but did not run after the root test failed. V1 lesson application routes appear removed, while legacy progress reads remain in `features/progress/server/data.ts`. A missing or stale seed breaks current program/run/voice-log writes. Live FK behavior remains unverified.

## Privacy inventory

All rows below have unspecified retention and no in-app deletion/export path found. SQL cascades on auth-user deletion, but no user-facing account deletion flow exists. Owner and admin read exposure follows SQL policies; platform operators and service-role clients also require governance. Owner review is needed for retention, access, and minimization.

| Store / fields | Purpose and requirement | Exposure and minimization |
|---|---|---|
| `users`: id, email, role, onboarding flag, timestamps | Auth identity and access; required | Owner/admin; email necessary for auth, role for access. |
| `student_profiles`: display_name; age_range, grade_level, school_name, goals, disability_support_notes | Display name required; other fields optional onboarding context | Owner/admin; disability notes and school/age detail warrant strong minimization and retention decision. |
| `accessibility_settings`: font_scale, high_contrast, reduced_motion, audio_instructions, large_touch_targets, keyboard_navigation_hints | Optional choices with defaults; adaptive UI | Owner/admin; choices can disclose disability needs. |
| `voice_command_logs`: transcript, normalized_transcript, parsed_action, status, failure_reason, lesson references, timestamps | Optional client logging controlled by browser localStorage choice | Owner/admin; free text may contain sensitive speech. Limit purpose and retention. Raw audio is not stored by this code path. |
| `programs`, `program_runs`: workspace_state, execution_result, error_message, lesson references | Saved work and run history; client sends runs opportunistically | Owner/admin; free-form code/text may contain personal information. |
| `lesson_v2_progress`, legacy `progress`: completion status/time | Learning continuity and dashboard | Owner/admin; learning history; legacy reads remain. |
| `confidence_checkins`: levels/reflection | Legacy reflection capability; no active submission route found | Owner/admin; reflection free text should be reviewed for retention. |
| Guest `localStorage`: demo progress, privacy acknowledgement, logging preference | Device-local demo and preferences | Anyone with browser/device access; reset control exists for demo progress. |

The lesson UI discloses voice processing and offers a logging-off choice (`voice-lesson-client.tsx:2178-2205`). README discloses Groq and browser vendor processing. A dedicated privacy notice, full retention schedule, export, and deletion flow were not found. Project-owner review is required; this is not legal certification.

## Accessibility and performance source baseline

Source includes Vietnamese document language, labels, global focus-visible styles, 48px default buttons, high contrast/font scale/large target/reduced motion settings, an `aria-live` global command area, workspace zoom/navigation controls, modal focus trap and restoration, and text fallback. Source review cannot establish keyboard access to Blockly blocks, announcements after every voice action, target sizes everywhere, or browser zoom/screen-reader behavior; these need manual tests. The lesson client is 2,595 lines and combines Blockly injection, serialization, command handling, confirmation, ASR state, progression, persistence, and dialog UI. Blockly is initialized client-side. Multiple effects/listeners and serialization paths create plausible load/rerender risks; no bundle or runtime profile was measured. Dynamic server rendering is explicit on admin; authenticated pages read cookies/user data. No optimization change is recommended from source size alone.

## Security, operations, and limits

`next.config.ts` sends nosniff, Referrer-Policy, Permissions-Policy, and X-Frame-Options DENY. CSP and explicit HSTS are absent in source; HTTPS/HSTS depends on deployment. `dangerouslySetInnerHTML` in layout contains a fixed inline script, not user content. Same-origin ASR URL and server-only Groq/local tokens avoid browser secret exposure; anon Supabase key and optional admin email list are public by design. API route details and risks are in the register. Server operation logs are one-line JSON without bodies/transcripts; no request IDs, client error capture, metrics, uptime/readiness checks, external error tracking, incident response, or demonstrated backup/restore runbook were found. Release checklist requires backups and manual smoke but does not prove them. No live deployment or secrets were accessed.
