# Competition V3 visual review

Seeded test-only competition, synthetic MC/team/presentation credentials. Official public prompts/maps are used for layout coverage; no production data/token was accessed. Browser Edge transport is mocked. Desktop viewport1440×900; mobile390×844. Full-page captures retain viewport width and extend vertically for scrolling; QR is a panel crop at that viewport.

Exact local screenshot paths:

| Screen | Desktop | Mobile |
| --- | --- | --- |
| MC Competition Dashboard | [01-admin-dashboard.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/desktop/01-admin-dashboard.png>) | [01-admin-dashboard.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/mobile/01-admin-dashboard.png>) |
| Accessibility Demo | [02-accessibility-demo.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/desktop/02-accessibility-demo.png>) | [02-accessibility-demo.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/mobile/02-accessibility-demo.png>) |
| Accessibility Presentation | [03-accessibility-presentation.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/desktop/03-accessibility-presentation.png>) | [03-accessibility-presentation.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/mobile/03-accessibility-presentation.png>) |
| Accessibility Participant | [04-accessibility-participant.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/desktop/04-accessibility-participant.png>) | [04-accessibility-participant.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/mobile/04-accessibility-participant.png>) |
| Robot Demo | [05-robot-demo.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/desktop/05-robot-demo.png>) | [05-robot-demo.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/mobile/05-robot-demo.png>) |
| Robot Presentation | [06-robot-presentation.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/desktop/06-robot-presentation.png>) | [06-robot-presentation.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/mobile/06-robot-presentation.png>) |
| Robot Participant | [07-robot-participant.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/desktop/07-robot-participant.png>) | [07-robot-participant.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/mobile/07-robot-participant.png>) |
| Persistent Competition Join QR | [08-persistent-join-qr.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/desktop/08-persistent-join-qr.png>) | [08-persistent-join-qr.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/mobile/08-persistent-join-qr.png>) |
| Stage2 identity restoration | [09-stage2-identity-restoration.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/desktop/09-stage2-identity-restoration.png>) | [09-stage2-identity-restoration.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/mobile/09-stage2-identity-restoration.png>) |
| Final overall leaderboard | [10-final-leaderboard.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/desktop/10-final-leaderboard.png>) | [10-final-leaderboard.png](</home/thduy-h/Documents/TD/SAYNTAX mini game/artifacts/ui-review/mobile/10-final-leaderboard.png>) |

Contact sheets: `artifacts/ui-review/desktop-contact.png`, `artifacts/ui-review/mobile-contact.png`.

Observed and corrected during actual image inspection:

- Narrow mobile leaderboard columns split the Accessibility label into fragments. The table now retains readable columns inside a keyboard-focusable horizontal scroll region, with a mobile swipe hint. This is intentional table scrolling, not page-wide overflow.
- Generic6-column grid CSS distorted the dedicated4×4 Robot demo. The renderer now sizes rows/columns from map dimensions, restores border consistency and scales the robot within its cell. Maps and facing direction are readable.
- Initial full-document screenshots of two participant pages caught the lazy-loading fallback. Capture now waits for authenticated competition state and the expected question/demo heading. The final review requires actual populated screens, not successful PNG generation alone.
- Option letters wrapped onto a second line on mobile; the letter now has a non-shrinking, non-wrapping flex area.
- Demo Robot footer previously repeated official completion-point rules. It now explicitly explains local-only zero-score practice.
- Persistent QR was shortened to the single code-only link, enlarged to280px with four-module quiet zones. Playwright compares its actual bitmap with the expected QR matrix. Actual phone scanning from a projector still needs workshop rehearsal.

Review criteria: long Vietnamese context/options readable; no page-wide horizontal overflow; touch controls have44px minimum height; no participant item navigator; presentation answer cards/maps are read-only, with no answer or program submission buttons; shared challenge numbering/status/counts; consistent borders, typography and existing SAYNTAX palette. Mobile presentation text wraps naturally and requires vertical scrolling for full options. Desktop uses larger prompt typography and clear maps. Inputs/restoration labels remain readable. Synthetic screenshots contain no real team credentials.

Final review: all20 required populated screenshots inspected through both contact sheets; mobile participant and Robot demo originals additionally reopened after the final fixes. No remaining clipped prompt/options or page-wide overflow observed. The horizontally scrollable leaderboard is intentional. No full automated axe audit, physical projector/phone scan, iOS/Safari or hosted Supabase browser test was performed.
