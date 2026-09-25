# Pilot readiness

## PASS

- Automated lint, typecheck, unit tests and production build.
- Five public demo routes and unauthenticated API guards are covered by release smoke.
- V2 lesson/program UUID references are present in `supabase/seed.sql` and checked by tests.
- ASR proxy tests cover cloud/local routing, upload limits, rate limits and browser fallback signaling.

## MANUAL REQUIRED

- Set staging env, then run `npm run check:staging-env` without sharing its values.
- Run `SMOKE_BASE_URL=https://staging.example npm run smoke`.
- Run the authenticated student/admin checklist in `docs/release-checklist.md` with disposable accounts.
- Run one consented Vietnamese audio request with `ASR_AUDIO_FILE=... npm run smoke:asr`.
- Run `LOAD_BASE_URL=https://staging.example npm run load:smoke` and retain the JSON results.
- Apply the current migrations and seed before testing authenticated program/run/voice-log writes.

## KNOWN RISKS

- ASR rate limiting is per server instance, not distributed.
- Browser speech fallback quality depends on browser, microphone and network conditions.
- Auth, RLS, KPI counts and persistence cannot be accepted without staging credentials and live Supabase data.

## PILOT BLOCKERS

- Missing required staging environment values.
- Current migrations/seed not applied to staging.
- Any failed authenticated persistence, RLS isolation, real Groq smoke or production load smoke.
