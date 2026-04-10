# Architecture

## Monorepo

- `apps/web`: Next.js App Router application
- `packages/ui`: shared UI primitives
- `packages/shared-types`: domain and API types
- `packages/voice-parser`: browser transcript normalization and parsing logic
- `packages/block-engine`: workspace state helpers and execution engine
- `packages/lesson-engine`: lesson progression and completion logic
- `supabase/`: SQL migrations and seed data
- `docs/`: product, flow, and API reference

## Runtime Design

- Next.js handles the web UI, server actions, and route handlers
- Supabase provides auth, database access, and storage
- Blockly runs client-side in the lesson workspace
- Web Speech API runs in the browser and feeds the rule-based parser
- Shared packages isolate core logic from the web app

## Future Extension

The current B-lite structure keeps domain logic out of UI files so an `apps/api` service can be introduced later without rewriting lesson, block, or voice logic.

