# Deployment

## Competition V2 — current local candidate (2026-10-30)

The V2 deployment procedure below supersedes historical baseline-only instructions. No automatic push/publish. Keep verify_jwt=true and existing exact-origin CORS. Approved migration precedes seven redeploys and frontend publication. Hosted eight-team verification is required before production GO.

[Competition V2 guide](competition-v2.md) contains the authoritative architecture, scoring, deployment gates, rollback and rehearsal instructions. Historical audit entries below describe earlier candidates.

Cloudflare Pages uses build command `npm run build`, output directory `dist`, and Node 22. Set only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; never place a service-role key in the browser build. `public/_redirects` supports direct join URLs without router port forwarding.

The workshop backend consists of the reviewed `arena` schema migration and seven `arena-*` Edge Functions. Follow `docs/shared-supabase-migration.md` for the migration-history safety gate, exact function deployment command, exact-origin CORS secret, API schema setting, verification queries, and rollback procedure. Run the full staging rehearsal before enabling a production workshop.

## Vercel SPA routing

Deploy the repository root as a Vite application: install `npm ci`, build `npm run build`, output `dist`. The root `vercel.json` declares these settings and rewrites nested URLs to `/index.html`. Existing static assets are served by Vercel's filesystem handling. `public/_redirects` applies to Cloudflare Pages; Vercel uses `vercel.json` instead. No Next.js workspace build/output setting should override this Vite configuration.

React uses state-based views, with an explicit startup handler for `/join/:roomCode`; it does not require a router package. Direct navigation and refresh enter the player form, prefill the room code, then call the existing `arena-join-room` function only after a player submits a team name. A successful join canonicalizes the path and persists the existing session identity for refresh. QR, displayed URL and clipboard share the same validated `window.location.origin` URL; Supabase's origin is never used as the frontend join origin. This supports both the Vercel domain and a custom frontend domain.

Room codes follow the database contract: six A–Z/2–9 characters, normalized to uppercase. `/join/ABC123` opens the application with a recoverable validation message because `1` is outside that alphabet. Use a real generated code such as `ABC234` to test a successful join. Missing/malformed codes can be corrected in the same form. Full rooms show an eight-team error. The unchanged backend groups missing, expired and locked/closed rooms under `not_found`; the UI explains all three possibilities and directs the player to the MC. The client cannot determine which state caused that response without changing the backend contract.

Local verification:

```bash
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

For an existing system Chromium/Edge installation, set `PLAYWRIGHT_EXECUTABLE_PATH` to its executable. Playwright builds production assets with synthetic Supabase configuration and serves them through Vite preview; tests run desktop and 390×844 touch/mobile viewports, including direct links, refresh, QR bitmap contents, clipboard, API request bodies, session recovery and denial messages. Backend responses are mocked, with no production room/team writes. Unit tests validate the Vercel rewrite configuration; local preview is not the Vercel edge runtime.

After an authorized frontend deployment, verify `/`, the MC dashboard and a copied real `/join/:roomCode` link directly in a new mobile session, then refresh and join. Verify assets return their normal content types and the existing Supabase request succeeds. No Vercel deployment, project-setting change or Supabase backend change is performed by these local checks.

Join-routing verification on 2026-10-30: TypeScript/lint passed; 14 Vitest tests passed; 22 Playwright tests passed across desktop/mobile against the local production build with mocked Edge responses; production build and whitespace checks passed. The mobile join screen was also inspected visually. Supabase source/SQL files were verified byte-identical to the published checkpoint. This evidence does not claim the revised fallback is already deployed on Vercel or that new production room writes were tested.
