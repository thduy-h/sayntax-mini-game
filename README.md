# SheCanCode Voice

SheCanCode Voice is an accessibility-first, Scratch-inspired learning platform for female students with motor disabilities. The MVP combines guided block programming lessons, browser-based voice commands, student progress tracking, and lightweight admin tooling on a Next.js + Supabase stack.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- npm workspaces monorepo
- Supabase for auth, Postgres, and storage
- Blockly for the learning workspace
- Web Speech API for browser voice input

## Repository Layout

```text
apps/
  web/
packages/
  ui/
  shared-types/
  voice-parser/
  block-engine/
  lesson-engine/
supabase/
  migrations/
  seed.sql
docs/
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local environment files:

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

3. Fill in the Supabase variables in `apps/web/.env.local`.

4. Start the app:

   ```bash
   npm run dev
   ```

## Environment Variables

`apps/web/.env.local`

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_ALLOWLIST_EMAILS=
```

## Local Development

- `npm run dev` starts the Next.js app at `http://localhost:3000`
- `npm run lint` runs the web lint target
- `npm run typecheck` runs TypeScript checks across workspaces
- `npm run test` is reserved for package-level tests as features land
- `ADMIN_ALLOWLIST_EMAILS` is a comma-separated list used to safely enable admin sign-up for specific emails

## Deployment Notes

- Deploy `apps/web` to Vercel
- Provision Supabase Auth, Postgres, and Storage
- Apply SQL in `supabase/migrations`
- Load reference data from `supabase/seed.sql`
- Add production environment variables in Vercel and Supabase

## Current Status

Milestone 1 is scaffolded:

- Monorepo workspace layout
- Product-specific Next.js shell
- Shared package stubs
- Initial product and architecture docs

The next milestone is shared domain models plus the first Supabase schema pass.
