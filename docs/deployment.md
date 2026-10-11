# SAYNTAX deployment

Use separate Supabase projects and Vercel Preview/Production environments. GitHub connects to Vercel with **Root Directory = repository root**, Node.js **22**, npm **10.9.9 or 11**, `npm ci`, `npm run build --workspace @shecancode/web`, and output `apps/web/.next` (already in `vercel.json`). Keep the project Root Directory at the repository root so npm can install local workspaces. Next.js uses its default `.next` output.

Set the variables in [`.env.example`](../.env.example) in the matching Vercel environment. `NEXT_PUBLIC_SITE_URL` is that deployment's HTTPS origin and must also be allowed as the Supabase Auth redirect `/auth/callback`. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are client values. `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_ALLOWLIST_EMAILS`, and all Groq/ASR values are server values. Do not set local ASR variables in Vercel. Never commit pulled env files.

## Staging

1. Create a staging Supabase project; configure its Auth site URL and redirect URL.
2. From the repo root, with Supabase CLI credentials for **staging**: `supabase link --project-ref <staging-project-ref>` then `supabase db push --include-seed`. Confirm the linked project before pushing. Migrations run in timestamp order: initial schema, then V2 progress. Seed adds course, V1 reference content, five V2 lesson references with 25 steps, and role models; existing IDs are untouched on rerun. Do not use `db reset` on a remote project.
3. Set staging values from `.env.example` in Vercel **Preview**. Pull them to an ignored local file and run `DEPLOY_ENV_FILE=.env.staging.local npm run check:staging-env` (for example, `vercel env pull .env.staging.local --environment=preview`).
4. Deploy the GitHub branch to Vercel Preview.
5. Run `check:staging-env` against the pulled Preview env after any env change.
6. Run `SMOKE_BASE_URL=https://<staging-host> npm run smoke` with and without a student auth cookie; verify `/api/health` returns `{"status":"ok"}`, all five lessons, persistence after reload, student/admin isolation, cross-user denial, and admin KPI counts.
7. With a short Vietnamese audio file and a staging Groq key, run `ASR_MODE=cloud SMOKE_BASE_URL=https://<staging-host> ASR_AUDIO_FILE=<file> npm run smoke:asr`; check text fallback manually. This live call incurs provider usage.
8. Run `LOAD_BASE_URL=https://<staging-host> LOAD_CONCURRENCY=60 npm run load:smoke`; review success rate, latency, and critical 5xx.

## Production

1. Confirm all staging checks and the 60 concurrent smoke are acceptable.
2. Create a separate production Supabase project. Set production Auth URLs and Vercel **Production** values from `.env.example`. Pull and validate: `vercel env pull .env.production.local --environment=production` then `DEPLOY_ENV_FILE=.env.production.local npm run check:production-env`.
3. With credentials for **production**, verify the project ref, then run `supabase link --project-ref <production-project-ref>` and `supabase db push --include-seed`. Never run a remote database reset.
4. Deploy the approved GitHub commit to Vercel Production.
5. Run public, authenticated, access-control, persistence, ASR, and text-fallback smoke checks as above; inspect logs for critical 5xx.
6. Attach the production domain, update `NEXT_PUBLIC_SITE_URL` and Supabase Auth redirect URL to that domain, redeploy, and repeat smoke checks.
7. Accept only when: build passes; five lessons are reachable; authenticated persistence works and survives reload; students cannot access admin; cross-user access is denied; admin KPI counts are correct; real Groq ASR and text fallback work; staging 60 concurrent smoke is acceptable; no critical 5xx remain.
