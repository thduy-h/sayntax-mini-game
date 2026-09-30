# UX-01 — Learner journey experience audit

Audited on `main` at `5249fadedc942e3ad28b7dccf8ec68e9c8af456f`, including the uncommitted PR-05B working-tree changes present on 2026-09-30. This is a source-based UX audit for beginner learners with limited hand mobility. No browser session, learner interview, speech-provider call, or assistive-device trial was performed. A source-confirmed behavior is distinct from its expected human impact; the latter still needs observation.

## Journey at a glance

| Stage | Source-based assessment |
| --- | --- |
| Landing → demo/sign-in | Two large primary links distinguish immediate demo from account sign-in. Landing also offers direct links to each of five demos. |
| Lesson list → lesson | Demo and authenticated lists show title, summary, duration and step count; authenticated cards show progress and “Mở”, “Tiếp tục”, or “Ôn lại”. Dashboard also links to the next incomplete lesson. |
| First 60 seconds | The first step supplies an exact Vietnamese command and the global text bar can insert the sample. New voice use requires acknowledging a processing notice. In the lesson DOM, the notice and microphone are after a Blockly area with a 320 px minimum height, followed by a broad control strip. Whether they are visible without scrolling on a phone requires browser testing. |
| Act → understand result | Voice and text feed the same lesson command handler; live feedback, transcript and a screen-reader status exist. Some recognized commands report “processed” even when the requested action did not apply; ordinary hint requests change the side panel without reporting the hint itself. |
| Workspace → run → progress | Voice can add/select/edit/move blocks, navigate the workspace and run. Correct intermediate steps advance immediately and clear feedback; backward/nonadjacent navigation loads a starter workspace. Run output can disappear when a nonfinal run step advances. |
| Completion → next lesson | A semantic dialog has next/list/restart links and command input plus microphone controls. Its fit at small viewport height or high zoom is unverified. |

No source-confirmed UX-P0 prevents completing the normal first-lesson path. The consent button is semantic and does not require precise pointer drag-and-drop; first-use switch/keyboard access still needs an observed trial.

## Prioritized backlog

### UX-01A — First voice action competes with a full workspace and control strip

- **Priority:** UX-P1 — major first-use friction; mobile impact needs verification.
- **Learner moment:** Opens the first demo or authenticated lesson and wants to speak the displayed sample.
- **Observed source behavior:** The step title/sample precede a Blockly container with `min-h-[320px]`; the voice-processing notice is rendered after that container, then a wrapping strip contains microphone, retry, input selector, run, undo, nine viewport controls, step navigation and other actions. Microphone buttons stay disabled until the notice is acknowledged. The global text bar is fixed to the viewport bottom. Evidence: `apps/web/features/lesson-v2/components/voice-lesson-client.tsx` around lines 2274–2510 and `apps/web/app/demo/[slug]/page.tsx` line 18.
- **Why difficult:** A beginner may look for the next action in the empty Blockly area while the required voice start action is lower on the page. A motor-impaired learner must find and activate a semantic consent button before the primary voice path is available. The many adjacent controls dilute the step instruction.
- **Smallest improvement:** After measuring first-use behavior, place one clear start/notice action beside the current step and defer secondary workspace controls visually; preserve the approved disclosure and text fallback.
- **Likely files:** `apps/web/features/lesson-v2/components/voice-lesson-client.tsx`, possibly `apps/web/features/voice-control/components/global-command-bar.tsx`.
- **Browser/user testing:** **Required** at phone size, desktop, 200% zoom, keyboard/switch emulation and with a learner encountering the lesson for the first time.

### UX-01B — “Processed” can appear when a recognized action did not apply

- **Priority:** UX-P1 — misleading action outcome.
- **Learner moment:** Says a valid command when no suitable block is selected or the target field is unavailable.
- **Observed source behavior:** `setFieldFromIntent` can return `false` with a recovery message. `handleTranscriptCommand` nevertheless returns `handled: intent.kind !== "unknown"` and generic `Đã xử lý: …` for any recognized intent, regardless of `outcome.changed`; the global command bar styles handled feedback as a successful result. Evidence: `apps/web/features/lesson-v2/components/voice-lesson-client.tsx` around lines 1191–1235 and 1738–1811; `apps/web/features/voice-control/components/global-command-bar.tsx` around lines 176–191.
- **Why difficult:** The learner can hear/read both an apparent success and a corrective message, making it unclear whether the block changed or whether to repeat the command.
- **Smallest improvement:** Derive the command result from actual application/evaluation outcome and put one specific next action in the primary feedback. Leave parser vocabulary and lesson evaluator unchanged.
- **Likely files:** `apps/web/features/lesson-v2/components/voice-lesson-client.tsx`, focused lesson command-result tests.
- **Browser/user testing:** Useful for wording and announcement order; source-level regression tests are also needed.

### UX-01C — Asking for a hint does not deliver the hint in voice feedback

- **Priority:** UX-P1 — help is weak on the primary interaction path.
- **Learner moment:** Says “gợi ý” after getting stuck.
- **Observed source behavior:** `advanceHint()` increments `hintIndex`; ordinary `ask_hint` does not set `lastFeedback` or announce the selected hint. The hint text appears only in a separate sidebar paragraph. The first hint is already displayed at index 0, so a first request advances to the second hint. Evidence: `apps/web/features/lesson-v2/components/voice-lesson-client.tsx` around lines 1041–1051, 1657–1660 and 2698–2711.
- **Why difficult:** A voice-first learner receives a generic “opened hint” result but may not see or hear the useful instruction, especially if the sidebar is below the workspace on mobile.
- **Smallest improvement:** Put the chosen hint in the same concise feedback/announcement path as command results and make the first requested hint sequence explicit.
- **Likely files:** `apps/web/features/lesson-v2/components/voice-lesson-client.tsx`, focused lesson/announcement tests.
- **Browser/user testing:** **Required** with speech output, screen reader, and phone layout.

### UX-01D — Correct steps advance before the result can be understood

- **Priority:** UX-P1 — learning pace and output visibility.
- **Learner moment:** Adds the correct block or runs a program on a nonfinal run step.
- **Observed source behavior:** Evaluation sets success feedback, then `resetAfterSuccess` immediately clears `lastFeedback` and advances the step. The step-change effect clears `runResult`. Lesson 4 has a run step before its final hint step, so its program output can disappear on advancement. Evidence: `apps/web/features/lesson-v2/components/voice-lesson-client.tsx` around lines 629–638, 685–695 and 1146–1188; `packages/lesson-engine/src/seed-v2.ts` around lines 306–327.
- **Why difficult:** The learner may see a new task before understanding what succeeded or what the program printed. An announcement of the new step is not the same as a persistent result.
- **Smallest improvement:** Preserve a short success/output summary through the transition, or offer an explicit “Tiếp tục” step after success if learner testing shows immediate advance is too fast. Do not change evaluation rules.
- **Likely files:** `apps/web/features/lesson-v2/components/voice-lesson-client.tsx`, focused transition tests.
- **Browser/user testing:** **Required** to choose the right delay/acknowledgement pattern and observe speech timing.

### UX-01E — Reviewing a prior step can replace the current workspace

- **Priority:** UX-P1 — avoidable loss of visible work.
- **Learner moment:** Uses “Trước” or a step-list button to review instructions, then returns.
- **Observed source behavior:** Adjacent forward movement keeps the current Blockly workspace; backward and nonadjacent movement call `workspace.clear()` and load that step’s `starterWorkspace`. The step list allows direct jumps and has no completed-state marker; “Sau” is enabled before current-step completion. Evidence: `apps/web/features/lesson-v2/components/voice-lesson-client.tsx` around lines 677–683, 1949–1974 and 2677–2694.
- **Why difficult:** A learner may reasonably expect “Trước” to review a task while preserving their blocks. After returning, their current work can differ from what they just made, with no visible warning or restore action.
- **Smallest improvement:** Make the navigation consequence clear before replacing the workspace, and retain a recoverable snapshot for the current lesson session. Keep the forward learning sequence and evaluator intact.
- **Likely files:** `apps/web/features/lesson-v2/components/voice-lesson-client.tsx`, focused workspace-navigation tests.
- **Browser/user testing:** **Required** to confirm expectations and the least disruptive recovery wording.

### UX-01F — Current block is not persistently named outside Blockly

- **Priority:** UX-P2 — meaningful selection clarity improvement.
- **Learner moment:** Adds or selects a block, then wants to set text, number, or insertion position.
- **Observed source behavior:** Selection is shown through Blockly’s visual highlight and sometimes a transient “Đã chọn …” message. The separate ID list names blocks but does not mark the current selection. The learner can ask “mình đang ở đâu”, but that command is not surfaced near the edit prompt. Evidence: `apps/web/features/lesson-v2/components/voice-lesson-client.tsx` around lines 940–948, 1510–1569, 2263–2268 and 2714–2725.
- **Why difficult:** When focus moves to text commands or the workspace has several similar blocks, it is hard to know which block an edit will affect.
- **Smallest improvement:** Show one persistent “Đang chọn khối [ID]” status near the step/command feedback and expose the existing status command there.
- **Likely files:** `apps/web/features/lesson-v2/components/voice-lesson-client.tsx`, focused selection-status tests.
- **Browser/user testing:** **Required** with multiple similar blocks and screen reader feedback.

### UX-01G — Mobile workspace, controls and guidance may not fit together

- **Priority:** UX-P2 — layout risk pending observation.
- **Learner moment:** Performs later steps on a narrow or zoomed screen.
- **Observed source behavior:** Lesson pages use a viewport-height main; the lesson becomes a single-column grid below `lg`, the Blockly area keeps a 320 px minimum, the control strip wraps, the step sidebar follows the workspace, and the instruction paragraph is limited to two lines. The global command bar is fixed at the bottom. Evidence: `apps/web/app/demo/[slug]/page.tsx` line 18, `apps/web/app/lessons-v2/[slug]/page.tsx` line 42, `apps/web/features/lesson-v2/components/voice-lesson-client.tsx` around lines 2258–2292, 2307–2310 and 2677–2727.
- **Why difficult:** Instructions, current hint, feedback, output and text fallback can be separated by long scrolling or clipped. Actual reachability and occlusion cannot be established from CSS alone.
- **Smallest improvement:** After a viewport audit, keep current task, one primary input and last result visible together at phone size; allow remaining controls to scroll or collapse without hiding them.
- **Likely files:** `apps/web/features/lesson-v2/components/voice-lesson-client.tsx`, lesson route wrappers, possibly `apps/web/app/globals.css`.
- **Browser/user testing:** **Required** at 320–390 px widths, landscape, 200% zoom and mobile software keyboard open.

### UX-01H — Completion dialog has a small-height fit risk

- **Priority:** UX-P2 — completion may become hard to exit on small screens.
- **Learner moment:** Finishes a lesson on a short screen or at high zoom, especially before acknowledging the new voice notice.
- **Observed source behavior:** The modal is fixed, vertically centered, and locks body scrolling; its content has no explicit maximum height or internal overflow rule. It can include result, links, command input, microphone and a long disclosure. Evidence: `apps/web/features/lesson-v2/components/voice-lesson-client.tsx` around lines 2060–2116 and 2140–2250.
- **Why difficult:** Lower navigation/command controls may fall outside the viewport even though the background cannot scroll. This is a source risk, not a reproduced failure.
- **Smallest improvement:** Set a viewport-relative maximum modal height and scroll its content while preserving focus trapping and command access.
- **Likely files:** `apps/web/features/lesson-v2/components/voice-lesson-client.tsx`.
- **Browser/user testing:** **Required** at phone size, landscape, 200% zoom and with the software keyboard.

### UX-01I — The authenticated “Trợ giúp” navigation item is a dead end

- **Priority:** UX-P2 — misleading recovery route.
- **Learner moment:** Leaves a confusing lesson and chooses “Trợ giúp” in the main navigation.
- **Observed source behavior:** The nav item links to `/onboarding`; the onboarding page immediately redirects an already-onboarded learner to `/dashboard`. Evidence: `apps/web/components/app-nav.tsx` line 11 and `apps/web/app/onboarding/page.tsx` lines 26–28.
- **Why difficult:** The learner gets no help and loses the lesson context.
- **Smallest improvement:** Point the item to an existing useful help destination or relabel/remove it until that destination exists; preserve in-lesson “Gợi ý”.
- **Likely files:** `apps/web/components/app-nav.tsx`, an existing help destination if selected.
- **Browser/user testing:** Route behavior is source-confirmed; test the new destination with learners before release.

### UX-01J — Progress read failure looks like no progress

- **Priority:** UX-P2 — directly learner-visible resilience gap.
- **Learner moment:** Returns after a Supabase/RLS/network read failure.
- **Observed source behavior:** `getLessonV2Progress` and `getLessonV2CompletionCounts` return empty maps on any error. The lesson route computes the first incomplete step from that map, so a read failure can send the learner to step 1 while list cards show zero completion. Evidence: `apps/web/features/lesson-v2/server/progress-data.ts` around lines 22–82 and `apps/web/app/lessons-v2/[slug]/page.tsx` around lines 26–33.
- **Why difficult:** The UI gives no indication that progress failed to load and may appear to have forgotten completed work.
- **Smallest improvement:** Distinguish “not started” from “could not load progress” in the learner-facing state and offer retry; keep the lesson usable.
- **Likely files:** `apps/web/features/lesson-v2/server/progress-data.ts`, `apps/web/app/lessons-v2/[slug]/page.tsx`, `apps/web/app/lessons-v2/page.tsx`.
- **Browser/user testing:** Staging fault-injection and learner wording test required.

### UX-01K — “Dùng câu mẫu” only fills the text field

- **Priority:** UX-P3 — small wording polish.
- **Learner moment:** Chooses the sample command in the global text bar.
- **Observed source behavior:** The button sets the input value and focuses it; it does not execute the command. Evidence: `apps/web/features/voice-control/components/global-command-bar.tsx` around lines 145–159.
- **Why difficult:** Some beginners may expect “use sample” to perform the action immediately, while others may value a chance to inspect it first.
- **Smallest improvement:** If learner testing confirms confusion, label the action “Chèn câu mẫu” or explain that “Thực hiện” is the next step.
- **Likely files:** `apps/web/features/voice-control/components/global-command-bar.tsx`.
- **Browser/user testing:** Required before choosing between relabeling and execution.

## Small implementation slices

1. **UX-02 — Truthful command outcomes.** Make the primary result say whether a recognized action applied and provide one recovery action. Touch lesson command-result handling and focused tests only. Do not change parser vocabulary, ASR or evaluation rules. Verify success, no-target, failed mutation and pending confirmation cases.
2. **UX-03 — Deliver requested hints.** Put the actual chosen hint in visible feedback and the existing announcement path; clarify first-request order. Touch the lesson client and announcement tests only. Verify voice and button requests, screen reader output, and no duplicate announcements.
3. **UX-04 — Preserve step success and run output.** Keep the completed-step result perceivable across automatic advancement, including the nonfinal run step. Touch the lesson client and transition tests only. Verify no duplicate step skips and that completion behavior stays intact.
4. **UX-05 — Recoverable step navigation.** Protect the current workspace when navigating backward or jumping steps; make any reset consequence explicit. Touch lesson navigation and focused workspace tests only. Verify voice-created blocks, step back/forward, restart and resume.
5. **UX-06 — First-use/mobile control hierarchy.** First observe the cold-start and zoom scenarios in a browser with target learners; then expose the primary voice/text action and current task together while preserving the disclosure and secondary controls. Touch lesson presentation and responsive styling only after those observations.

## Manual learner tests before selecting a larger UI change

- Give a new learner with limited hand mobility the first demo lesson with no explanation. Time to first correct block, count help requests, note whether they find the voice notice, microphone and text fallback; repeat with switch/keyboard emulation.
- Use a phone-width viewport and 200% zoom. Check the task, microphone, text input, hint, feedback, run output and step list while the software keyboard is open. Include the completed-lesson dialog and fresh processing notice.
- Deny microphone permission; then simulate ASR unavailable and a low-confidence/ambiguous transcript. Observe whether the learner understands what happened and recovers via text without a precise pointer.
- Build at least two similar blocks. Ask the learner to select one, edit it, ask “mình đang ở đâu”, request a hint, make a mistaken command, then undo or correct it. Record which block they believe is selected.
- Complete the first lesson and the nonfinal run step in lesson 4. Observe whether success and output are understood before the next step appears; use the next/list/restart controls by voice and text.
- Navigate backward and forward after creating blocks. Check whether learners expect their workspace to remain, whether they notice a reset, and whether any recovery path is understandable.
- Fault-inject a progress read failure in staging and observe whether the learner mistakes it for lost progress. Do not use real learner records.

## Verification

`npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` all exited 0 on the audited working tree. The Next build completed with the existing `proxyClientMaxBodySize: "11mb"` experimental-setting notice. No UX fix or application code change was made for UX-01.
