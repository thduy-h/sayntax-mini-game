# Team recovery by registered name

In Game Arena's join page, a team that lost its recovery credential may now
enter its **registered team name** rather than a UUID.

1. Team scans the existing room QR and opens **Mất credential? Khôi phục bằng tên đội**.
2. Team enters its registered name and requests recovery.
3. The browser creates a new private credential and shows the request ID.
4. BTC verifies the displayed request ID and team name **in person**, then MC
   approves the matching request on the MC dashboard.
5. The team clicks **Khôi phục đội** using the credential in its browser.

This flow reuses the existing `request_competition_recovery` and
`approve_recovery` RPCs. It **does not** grant team access on name alone.
Approval rotates the recovery hash and revokes previous team tokens. The team
rejoins the same competition team ID and keeps existing scores.

Name resolution is scoped to the room's competition, ignores capitalization
and repeated spaces, and rejects ambiguous names. The previous ID-based API
request remains supported for older clients.

## Release gate

- Redeploy **arena-join-room** Edge Function after frontend deployment.
- No database migration required.
- Review `npm run test:edge`, `npm run build`, and E2E for request → MC
  approval → rejoin.
- If Postgres is unhealthy, do not issue multiple recovery requests or deploy.
- No production change is performed by this pull request.
