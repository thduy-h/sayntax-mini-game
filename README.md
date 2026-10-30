# SAYNTAX Game Arena

## Competition V2 — current local candidate (2026-10-30)

Competition V2 is implemented locally: two independent stages, stable team recovery, finalized-only equal-weight leaderboard and read-only presentation. Start at `/competition`. Practice remains available. V2 requires a new reviewed migration and seven Edge redeploys; no production changes were executed.

[Competition V2 guide](docs/competition-v2.md) contains the authoritative architecture, scoring, deployment gates, rollback and rehearsal instructions. Historical audit entries below describe earlier candidates.

SAYNTAX Game Arena is a Vietnamese-first interactive workshop platform for learning digital skills through play. It ships with two complete games:

- **Accessibility Unlock** — choose inclusive interface decisions, see the explanation, and build a score across a 12-scenario bank (four per standard workshop round).
- **Robot Commands** — solve nine curated levels, run step-by-step, debug collisions, compare Ghost Paths, and generate bounded seeded puzzles.

The facilitator can open a workshop room for 6–8 teams, share a generated room code and QR, manage teams, and show a live leaderboard. The browser automatically uses a standalone adapter when Supabase variables are empty, so a rehearsal works without accounts or backend setup.

## Run it

```bash
npm install
npm run dev
```

Production verification:

```bash
npm test
npm run build
```

The app is Vite + React + TypeScript with Tailwind’s build pipeline, Motion animations, Lucide icons, and pure game engines in `src/lib/gameLogic.ts`.

## Supabase and Cloudflare Pages

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only when the workshop backend is ready. The reviewed shared-project migration is `supabase/migrations/20261030100000_arena_schema.sql`; inspect linked migration history and run its dry-run gate before applying it. The seven `arena-*` Edge Functions validate MC/team tokens and calculate scores from canonical content. The service-role key must never be exposed to Vite or Cloudflare Pages.

Cloudflare Pages settings: build command `npm run build`, output directory `dist`, Node 22. `public/_redirects` keeps direct join links working without port forwarding. Exact migration, Edge deployment, origin, and verification commands are in [docs/shared-supabase-migration.md](docs/shared-supabase-migration.md).

## Vercel join links

Vercel builds this repository as Vite (`npm run build`, output `dist`). The root `vercel.json` supplies the SPA fallback for direct `/join/:roomCode` links and refreshes; React opens the existing player form. See [deployment and join-link verification](docs/deployment.md#vercel-spa-routing).

## Existing product audit

This repository contains the standalone Game Arena application. The separate SAYNTAX learning website is not modified by this implementation.
