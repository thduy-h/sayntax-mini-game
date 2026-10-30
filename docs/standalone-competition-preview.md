# Standalone competition UI preview

Open `/competition/preview` to review the competition interface without a backend. With no frontend Supabase configuration, `/competition` opens this preview automatically. A configured production competition continues to use its real backend; backend failures never activate this preview silently.

The preview reuses `AdminStage`, `Participant`, `Presentation`, `Leaderboard`, and the existing game/demo components. Use the view controls to switch between MC, team, and presentation. Start Accessibility, try the team screen, return to MC to advance or finalize, then start Robot. Configuration and submissions live in React memory and reset on refresh. The simulated MC can advance/finalize freely for visual review; this does not represent production authorization or deadline enforcement.

The QR opens a new, independent UI preview on the scanning device. It does not register a real team or synchronize devices. Names and zero-point leaderboard rows are illustrative. Practice submissions show local confirmation and never produce official XP. No API requests, production identities, or database writes occur.

`?view=team` and `?view=presentation` select the initial view. Screenshots from the desktop/mobile browser checks are saved under `artifacts/ui-review/standalone-{desktop,mobile}/`.
