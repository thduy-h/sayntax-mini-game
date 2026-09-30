import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { nextLessonHint, resolveLessonCommandOutcome, unknownCommandRecovery } from "./lesson-command-outcome";
import { commandFeedbackAnnouncement } from "../../voice-control/utils/accessible-announcements";

assert.deepEqual(
  resolveLessonCommandOutcome({
    actionFeedback: "Đã thêm khối bắt đầu.",
    applied: true,
    intentKind: "add_block",
    understoodAs: "thêm khối bắt đầu",
  }),
  { feedback: "Đã thêm khối bắt đầu.", handled: true, outcome: "applied" },
);

assert.equal(
  unknownCommandRecovery({ cursorLabel: "cuối chương trình", sampleUtterance: "thêm khối bắt đầu", selectableBlockCount: 0 }),
  "Mình chưa hiểu câu lệnh này. Workspace chưa có khối để chọn. Em có thể nói: “thêm khối bắt đầu”, hoặc “gợi ý”.",
);
assert.equal(
  unknownCommandRecovery({ cursorLabel: "cuối chương trình", sampleUtterance: null, selectableBlockCount: 0 }),
  "Mình chưa hiểu câu lệnh này. Workspace chưa có khối để chọn. Hãy thêm khối phù hợp với yêu cầu hiện tại hoặc nói “gợi ý”.",
);
assert.match(
  unknownCommandRecovery({ cursorLabel: "sau khối 1", sampleUtterance: "thêm khối in", selectableBlockCount: 2 }),
  /chọn khối 2, chèn sau khối 2/,
);
assert.doesNotMatch(
  unknownCommandRecovery({ cursorLabel: "cuối chương trình", sampleUtterance: null, selectableBlockCount: 0 }),
  /chọn khối \d/,
);

assert.deepEqual(
  resolveLessonCommandOutcome({
    actionFeedback: "Đã đặt chữ Xin chào.",
    applied: true,
    evaluation: { completed: false, feedback: "Bạn còn thiếu khối bắt đầu." },
    intentKind: "set_text",
    understoodAs: "đặt chữ Xin chào",
  }),
  {
    feedback: "Đã đặt chữ Xin chào. Bạn còn thiếu khối bắt đầu.",
    handled: true,
    outcome: "applied",
  },
);

assert.deepEqual(
  resolveLessonCommandOutcome({
    actionFeedback: "Hãy chọn khối trước khi đặt chữ.",
    applied: false,
    intentKind: "set_text",
    understoodAs: "đặt chữ Xin chào",
  }),
  { feedback: "Hãy chọn khối trước khi đặt chữ.", handled: false, outcome: "not_applied" },
);
assert.deepEqual(
  resolveLessonCommandOutcome({
    actionFeedback: "Hãy chọn khối trước khi đặt chữ.",
    applied: false,
    evaluation: { completed: true, feedback: "Bước này đã hoàn thành." },
    intentKind: "set_text",
    understoodAs: "đặt chữ Xin chào",
  }),
  { feedback: "Hãy chọn khối trước khi đặt chữ.", handled: false, outcome: "not_applied" },
);
assert.equal(
  commandFeedbackAnnouncement(resolveLessonCommandOutcome({
    actionFeedback: "Hãy chọn khối trước khi đặt chữ.",
    applied: false,
    intentKind: "set_text",
    understoodAs: "đặt chữ Xin chào",
  })),
  "Hãy chọn khối trước khi đặt chữ.",
);

assert.deepEqual(
  resolveLessonCommandOutcome({
    actionFeedback: "Khối này đã ở vị trí cuối.",
    applied: false,
    intentKind: "move_block",
    understoodAs: "di chuyển khối xuống dưới",
  }),
  { feedback: "Khối này đã ở vị trí cuối.", handled: false, outcome: "not_applied" },
);

assert.deepEqual(
  resolveLessonCommandOutcome({
    actionFeedback: "Đã ở mức phóng to tối đa.",
    applied: false,
    intentKind: "zoom_workspace",
    understoodAs: "phóng to workspace",
  }),
  { feedback: "Đã ở mức phóng to tối đa.", handled: false, outcome: "not_applied" },
);

assert.deepEqual(
  resolveLessonCommandOutcome({
    actionFeedback: "Mình chưa hiểu câu lệnh này. Em có thể nói: chọn khối 2, hoặc gợi ý.",
    applied: false,
    intentKind: "unknown",
    understoodAs: "chưa hiểu câu lệnh",
  }),
  {
    feedback: "Mình chưa hiểu câu lệnh này. Em có thể nói: chọn khối 2, hoặc gợi ý.",
    handled: false,
    outcome: "unsupported",
  },
);

assert.deepEqual(
  resolveLessonCommandOutcome({
    applied: true,
    evaluation: { completed: true, feedback: "Tốt lắm, chương trình đã chạy đúng." },
    intentKind: "run_program",
    understoodAs: "chạy chương trình",
  }),
  { feedback: "Tốt lắm, chương trình đã chạy đúng.", handled: true, outcome: "applied" },
);
assert.deepEqual(
  resolveLessonCommandOutcome({
    applied: true,
    evaluation: { completed: false, feedback: "Chương trình đã chạy nhưng chưa đúng yêu cầu." },
    intentKind: "run_program",
    understoodAs: "chạy chương trình",
  }),
  { feedback: "Chương trình đã chạy nhưng chưa đúng yêu cầu.", handled: true, outcome: "applied" },
);

const hints = ["Mỗi chương trình cần điểm bắt đầu.", "Hãy thêm khối bắt đầu.", "Thử nói: thêm khối bắt đầu."];
const firstRequest = nextLessonHint(hints, 0);
assert.deepEqual(firstRequest, { index: 1, feedback: "Gợi ý: Hãy thêm khối bắt đầu." });
const secondRequest = nextLessonHint(hints, firstRequest!.index);
assert.deepEqual(secondRequest, { index: 2, feedback: "Gợi ý: Thử nói: thêm khối bắt đầu." });
assert.deepEqual(nextLessonHint(hints, secondRequest!.index), { index: 0, feedback: "Đã xem hết gợi ý mới. Xem lại gợi ý đầu: Mỗi chương trình cần điểm bắt đầu." });
assert.deepEqual(nextLessonHint(["Thử thêm khối bắt đầu."], 0), { index: 0, feedback: "Đây là gợi ý duy nhất: Thử thêm khối bắt đầu." });
assert.equal(nextLessonHint([], 0), null);
assert.equal(nextLessonHint(["   "], 0), null);

const hintOutcome = resolveLessonCommandOutcome({
  actionFeedback: firstRequest!.feedback,
  applied: true,
  evaluation: { completed: true, feedback: "Bạn đã mở gợi ý — tiếp tục nhé!" },
  intentKind: "ask_hint",
  understoodAs: "mở gợi ý",
});
assert.deepEqual(hintOutcome, { feedback: firstRequest!.feedback, handled: true, outcome: "applied" });
assert.equal(commandFeedbackAnnouncement(hintOutcome), firstRequest!.feedback);
assert.deepEqual(
  resolveLessonCommandOutcome({
    actionFeedback: "Bước này chưa có gợi ý để xem.",
    applied: false,
    intentKind: "ask_hint",
    understoodAs: "mở gợi ý",
  }),
  { feedback: "Bước này chưa có gợi ý để xem.", handled: false, outcome: "not_applied" },
);

const client = readFileSync("features/lesson-v2/components/voice-lesson-client.tsx", "utf8");
assert.match(client, /return finishLessonCommand\(transcript, intent, outcome, actionFeedback, evaluation\)/);
assert.match(client, /return executePendingAction\(transcript\)/);
assert.match(client, /if \(!evaluation\?\.completed\) setLastFeedback\(result\.feedback\)/);
assert.doesNotMatch(client, /intent\.kind !== "unknown"/);
assert.match(client, /previousValue === value/);
assert.match(client, /String\(target\.getFieldValue\(fieldName\) \?\? ""\) === previousValue/);
assert.match(client, /if \(!target\) \{\s*setLastFeedback\(intent\.kind === "set_text"/);
assert.match(client, /return \{ applied: !alreadyAtEnd, changed: false, shouldEvaluate: false \}/);
assert.match(client, /Workspace đã ở mép này/);
assert.match(client, /const applied = outcome\.applied \?\? outcome\.changed/);
assert.match(client, /commandFeedbackAnnouncement\(lastCommandResult\)/);
assert.match(client, /const feedback = advanceHint\(\);\s*if \(!feedback\)/);
assert.match(client, /deliverHintFeedback\(result\.feedback, evaluation\)/);
assert.match(client, /\{lastFeedback && <p className="min-w-0 break-words font-semibold text-black">\{lastFeedback\}<\/p>\}/);
const commandBar = readFileSync("features/voice-control/components/global-command-bar.tsx", "utf8");
assert.match(commandBar, /lastResult\.handled \? "text-black" : "text-red-700"/);

console.log("lesson command outcome tests passed");
