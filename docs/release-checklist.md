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
- [ ] Confirm progress and voice log belong only to the test user; repeat with voice logging disabled.
- [ ] Simulate ASR failure; lesson stays usable and Web Speech or text fallback is offered.
- [ ] Sign out; protected pages and persistence APIs reject the session.

## Authorization and data integrity

- [ ] Student `/admin` shows the denial screen; admin can open KPI data.
- [ ] Admin KPI totals match direct Supabase counts for students, completed V2 steps, voice commands and unsupported commands.
- [ ] Fake/mismatched lesson and step IDs return `400` and do not create progress, program, run or voice-log rows.
- [ ] Unauthenticated progress/program/run/voice-log requests return `401`.
- [ ] Oversized ASR upload returns `413`; unsupported audio returns `415`.

## ASR and privacy

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
