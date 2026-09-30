# SAYNTAX release checklist

## Automated

- [ ] Validate required staging configuration without printing values: `npm run check:staging-env`.
- [ ] CI is green: lint, typecheck, tests and production build.
- [ ] Run public/security smoke: `SMOKE_BASE_URL=https://staging.example.com npm run smoke`.
- [ ] Run authenticated smoke with a disposable student session cookie: `SMOKE_BASE_URL=... SMOKE_AUTH_COOKIE='...' SMOKE_EXPECT_ROLE=student npm run smoke`.
- [ ] Run safe GET load profiles: `LOAD_BASE_URL=https://staging.example.com npm run load:smoke`.
- [ ] Confirm no unexpected `429`, `5xx`, timeout or material p95 regression.

## Environment and infrastructure

- [ ] Vercel production has Supabase URL/anon key, service-role key, site URL and admin allowlist.
- [ ] Supabase migrations, RLS policies and seed lesson IDs match the release commit.
- [ ] Run the repository pair gate: `node --import tsx scripts/lesson-seed-mapping.test.ts` (also included in `npm test`). It checks the exact five lesson and 25 step rows, step parents, duplicate IDs, and API pair guards.
- [ ] After applying migrations and seed to **staging**, set `STAGING_SUPABASE_URL` and `STAGING_SUPABASE_SERVICE_ROLE_KEY` through the operator's secret environment, then run `node --import tsx scripts/verify-v2-seed-live.ts`. The script performs only SELECT queries; it does not prove RLS or foreign-key writes.
- [ ] With a disposable staging student account, POST a valid V2 pair to `/api/programs`, `/api/program-runs`, and `/api/voice-command-logs`; require success and inspect the owned rows. Repeat with a wrong-parent pair and require `400`, then query with a second student and require no cross-user rows. Delete the disposable account/data after review. This is the required live FK/RLS check; no production learner account should be used.

For the disposable staging write check, set `STAGING_BASE_URL` and `STAGING_STUDENT_COOKIE` in the operator environment. These commands use lesson 1, step 1. Expect `200`, `200`, `201`, then `400`; do not run them against production:

```bash
curl -i --cookie "$STAGING_STUDENT_COOKIE" -H 'Content-Type: application/json' -d '{"lessonId":"40000000-0000-0000-0000-000000000001","lessonStepId":"40000000-0000-0000-0000-000000000101","workspaceState":{"version":1,"blocks":[]}}' "$STAGING_BASE_URL/api/programs"
curl -i --cookie "$STAGING_STUDENT_COOKIE" -H 'Content-Type: application/json' -d '{"lessonId":"40000000-0000-0000-0000-000000000001","lessonStepId":"40000000-0000-0000-0000-000000000101","workspaceState":{"version":1,"blocks":[]},"executionResult":{"errors":[],"output":[],"success":true,"variables":{}}}' "$STAGING_BASE_URL/api/program-runs"
curl -i --cookie "$STAGING_STUDENT_COOKIE" -H 'Content-Type: application/json' -d '{"lessonId":"40000000-0000-0000-0000-000000000001","lessonStepId":"40000000-0000-0000-0000-000000000101","transcript":"staging-check","normalizedTranscript":"staging-check","parsedAction":{"type":"unknown"},"status":"unsupported"}' "$STAGING_BASE_URL/api/voice-command-logs"
curl -i --cookie "$STAGING_STUDENT_COOKIE" -H 'Content-Type: application/json' -d '{"lessonId":"40000000-0000-0000-0000-000000000001","lessonStepId":"40000000-0000-0000-0000-000000000201","workspaceState":{"version":1,"blocks":[]}}' "$STAGING_BASE_URL/api/programs"
```
- [ ] A recent database backup exists and restore ownership is assigned.
- [ ] `ASR_MODE=cloud`, `GROQ_API_KEY` and `GROQ_ASR_MODEL=whisper-large-v3-turbo` are set server-side.
- [ ] No secret uses a `NEXT_PUBLIC_` prefix; preview and production env are separated.
- [ ] Vercel deployment comes from the reviewed commit; GitHub Actions does not deploy.

## Student end-to-end (disposable test account)

- [ ] Sign up, verify email if enabled, sign in and finish onboarding.
- [ ] Open dashboard and the first authenticated lesson.
- [ ] Complete one step, reload, and confirm the next incomplete step is restored.
- [ ] Use one voice command and one text command; confirm Blockly changes through the same command pipeline.
- [ ] Run the program; confirm output and a program/program-run row for the test user.
- [ ] Confirm progress belongs only to the test user; command logging is off on first visit and creates no voice-log row while voice still works. Enable logging explicitly, issue a disposable command, confirm its row belongs only to the test user, then reload and confirm logging returns to off.
- [ ] Simulate ASR failure; lesson stays usable and Web Speech or text fallback is offered.
- [ ] Sign out; protected pages and persistence APIs reject the session.

## Authorization and data integrity

- [ ] Student `/admin` shows the denial screen; admin can open KPI data.
- [ ] Admin KPI totals match direct Supabase counts for students, completed V2 steps, program runs, voice commands and unsupported commands; ordinary admin UI shows no raw transcripts or sensitive profile rows.
- [ ] Fake/mismatched lesson and step IDs return `400` and do not create progress, program, run or voice-log rows.
- [ ] Unauthenticated progress/program/run/voice-log requests return `401`.
- [ ] Oversized ASR upload returns `413`; unsupported audio returns `415`.

## ASR and privacy

- [ ] Confirm the approved pilot choices and remaining decisions in `docs/privacy-data-governance.md`; assign manual handling for the 30-day voice-log target until automated enforcement exists.
- [ ] Before real-user registration, verify both lesson and global microphone disclosures, voice use with logging off, explicit logging opt-in, default-off behavior on a new/shared device, and the assisted export/deletion request path.
- [ ] With a disposable staging account, verify Auth-user deletion cascades to all personal tables, sessions are revoked, and backup/provider exceptions are documented; do not use a real learner account.

- [ ] With a short consented Vietnamese audio file: `ASR_MODE=cloud ASR_AUDIO_FILE=./sample.wav SMOKE_BASE_URL=... npm run smoke:asr`.
- [ ] Logs contain no API key, raw audio, transcript, cookie or sensitive onboarding fields.
- [ ] Privacy copy states that cloud audio goes to a third party and raw audio is not retained by SAYNTAX.
- [ ] Verify Chrome and Edge microphone permission denied, Web Speech unavailable and text-only paths.

## Workshop local mode

- [ ] Start FastAPI separately and verify: `ASR_MODE=local LOCAL_ASR_URL=http://127.0.0.1:8000 npm run smoke:asr`.
- [ ] Next.js and FastAPI use the same `LOCAL_ASR_TOKEN`; browsers never call port 8000 directly.
- [ ] Verify `/health`, one short Vietnamese transcription, GPU memory and operator-network/tunnel access.
- [ ] Do not expose workshop FastAPI publicly without HTTPS, authentication and traffic controls.

The load script targets only `GET /` and `GET /demo`; it never calls Groq or creates accounts/data. The in-memory ASR rate limit is per Vercel instance, not a distributed pilot-wide quota.
