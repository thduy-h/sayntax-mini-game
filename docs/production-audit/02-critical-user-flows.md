# Critical user flows and recovery

Snapshot `bd64e77db900d0c76f5a1bd873cb2e241a6465fc`. Source trace only; no browser, live Supabase, or ASR model was used.

| Journey step | Dependency and failure | Current user-visible behavior | Loss, duplicate, stale state, recovery |
|---|---|---|---|
| Anonymous landing → `/demo` → `/demo/[slug]` | Next/static app and browser JS; no Supabase required. | Demo list and workspace render from code seed; Blockly loading/error overlay has retry. | Device-local progress in localStorage; browser storage denial/clear or new device loses progress. Reset demo button exists. |
| Demo voice/text → Blockly mutation → run → progression | Microphone permission, same-origin ASR proxy to Groq/local; Web Speech fallback; text command bar. | ASR failures signal fallback; text input remains. Destructive delete/move asks spoken confirmation and supports cancel/undo. Output/feedback appears in lesson. | No server persistence in demo. Reload restores demo completion index, not necessarily every unsaved workspace mutation. Verify browser back/forward and malformed local state manually. |
| Sign-up → confirmation → sign-in | Supabase Auth, configured site URL, email delivery/provider setting; service role for admin signup. | Missing Supabase config shows message. Signup redirects to sign-in message if no session; callback exchanges code then onboarding. | Expired code redirects to sign-in error. Admin role update can fail after account creation, leaving partial signup. Email delivery/redirect settings unverified. |
| Onboarding → dashboard → lesson list | Supabase Auth and profile/settings upserts. | Server redirects unauthenticated users to sign-in; failed writes redirect with error text. Student dashboard uses code lesson seed and progress data. | Profile/settings/user completion writes are separate; partial onboarding possible. Retry via onboarding form; concurrent tabs and expired session untested. |
| Authenticated workspace → completion | Blockly/client JS plus Supabase server action to `lesson_v2_progress`. | UI advances; on failed completion save, feedback says account progress could not be saved, but learner can continue. Reads return empty map on errors. | Fire-and-forget save can race refresh/navigation; missing table/RLS causes apparent reset. Upsert prevents duplicate row, concurrent completions need test. |
| Program run → persistence | Block engine runs locally; `/api/program-runs` upserts program then inserts run with legacy FK IDs. | Run feedback from local engine; network/HTTP persistence response is not shown. | Missing seeded FK, Supabase failure, or refresh can lose history. Program upsert last writer wins; run insert may fail after program save. Repeated request creates duplicate runs. |
| Voice log persistence | Client optional logging, `/api/voice-command-logs`, Supabase. | User may disable logging; network/HTTP failures do not block lesson and are not surfaced. | Lost logs affect admin analysis; duplicate/replay inserts multiple rows. Transcript is retained when logging is enabled. |
| Admin sign-in → `/admin` | Supabase auth, DB role, RLS. | Nonadmin sees denial card; missing session redirects to sign-in; onboarding gate applies. | Seven data queries return zeros/empty arrays on errors, which can look like real zero activity. No retry affordance or freshness stamp. Direct URL checks are source-verifiable, staging enforcement is unverified. |

## Manual journeys required before real users

1. Keyboard-only and screen-reader first lesson with voice unavailable: add, select, edit, run, confirm/cancel destructive command, complete, navigate back/forward. Include Chrome/Edge and a mobile viewport with 200% zoom.
2. Sign-up with confirmation enabled, expired callback, sign-in, logout, direct protected URL/API, session expiry, student `/admin`, admin data query, and attempted direct role update.
3. Complete a lesson, refresh immediately, interrupt network, retry, open two tabs, run twice, send malformed workspace, and verify exact rows and visible recovery.
4. Deny microphone, fail Groq/local upstream, disable Web Speech, use text fallback, and inspect state announcements and focus after action.
5. Deploy current migrations and seed to staging, query FK targets, then verify every V2 program/run/log write and RLS owner/admin isolation.

These are verification gates, not claims of coverage. Do not use production learner data to exercise them.
