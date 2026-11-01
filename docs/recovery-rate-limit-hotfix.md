# Recovery rate-limit hotfix (shared workshop Wi-Fi)

## Problem
The shared-IP limit was only **6 recovery requests / 10 minutes**, and
the room join endpoint allowed **30 requests / minute / room / IP**.
Eight workshop teams sharing the same public Wi-Fi IP could be throttled
after a few attempts.

## Changes
- Room joins, inspect and recovery: **120 requests / minute / IP / room**.
- Recovery per public IP: **40 requests / 10 minutes**.
- Recovery per existing competition team: **5 requests / 10 minutes**,
  in addition to the IP budget; scoped by competition ID and team ID.
- Rate-limited requests return HTTP 429 with JSON
  `{ "error": "rate_limited", "retryAfterSeconds": 1..600 }`
  and a `Retry-After` header. The frontend displays an approximate wait.
- Only rejected requests read `arena.rate_limits` to calculate wait time.
- Other rate limits (room creation, state polling, submissions, MC) unchanged.

BTC still confirms each request **in person** before approving it. Name
alone is not sufficient to claim a team. No change to competition IDs,
recovery hashes, submission records or scores.

## Deploy

No schema migration. After CI and Edge tests:

1. Deploy the updated frontend (Vercel; merging main may auto-deploy).
2. Deploy updated Supabase Edge Function **arena-join-room** only,
   from a checkout that contains this PR:
   `supabase functions deploy arena-join-room --project-ref <project-ref>`
3. Smoke-test with one synthetic team in a test room. Verify recovery
   request → physical MC approval → rejoin, and that existing scores persist.
4. For the blocked case confirm HTTP 429 and a plausible Retry-After value.

Previously hit IP rate-limit windows are not reset. They use the new
threshold on the next request; old attempts still count until window expiry.
Do not clear `arena.rate_limits` on production and do not repeatedly retry
real team recovery during verification.

## Tests
Run `npm run build`, `npm test`, and `npm run test:edge` (which
picks up the new `rate_test.ts`). GitHub CI currently does not run Edge
tests; leave PR draft until tested.
