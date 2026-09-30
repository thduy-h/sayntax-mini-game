import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type { ProgramExecutionResult } from "@shecancode/shared-types";
import { completedStepAnnouncement, completedStepResult, completedStepWithFeedback } from "./lesson-step-transition";

const success = { completed: true, feedback: "Đúng rồi, em đã thêm khối in." };
const ordinary = completedStepResult(success, 0, 3, "Thêm khối in", null);
assert.deepEqual(ordinary, {
  feedback: success.feedback,
  fromStepIndex: 0,
  runResult: null,
  stepTitle: "Thêm khối in",
  toStepIndex: 1,
});
assert.equal(
  completedStepAnnouncement(ordinary!, "Đặt chữ"),
  "Bước 1 đã hoàn thành. Đúng rồi, em đã thêm khối in. Đang ở bước 2: Đặt chữ.",
);

const runResult: ProgramExecutionResult = {
  errors: [],
  output: ["Xin chào", "Bạn làm được"],
  success: true,
  variables: {},
};
const completedRun = completedStepResult(
  { completed: true, feedback: "Chương trình đã chạy đúng." },
  1,
  4,
  "Chạy chương trình",
  runResult,
);
assert.equal(completedRun?.runResult, runResult);
assert.deepEqual(completedRun?.runResult?.output, ["Xin chào", "Bạn làm được"]);
assert.equal(
  completedStepAnnouncement(completedRun!, "Thêm khối tiếp theo"),
  "Bước 2 đã hoàn thành. Chương trình đã chạy đúng. Đang ở bước 3: Thêm khối tiếp theo. Đầu ra: Xin chào.",
);

assert.equal(completedStepResult(success, 2, 3, "Bước cuối", runResult), null);
assert.equal(completedStepResult({ completed: false, feedback: "Chưa đúng." }, 0, 3, "Thử lại", runResult), null);
const hinted = completedStepWithFeedback(ordinary, 0, "Gợi ý: Hãy thêm khối in.");
assert.deepEqual(hinted, {
  ...ordinary,
  feedback: "Gợi ý: Hãy thêm khối in.",
});
assert.equal(
  completedStepAnnouncement(hinted!, "Đặt chữ"),
  "Bước 1 đã hoàn thành. Gợi ý: Hãy thêm khối in. Đang ở bước 2: Đặt chữ.",
);
assert.equal(completedStepWithFeedback(ordinary, 1, "Gợi ý không thuộc bước này."), ordinary);
assert.equal(completedStepWithFeedback(null, 0, "Gợi ý"), null);

const client = readFileSync("features/lesson-v2/components/voice-lesson-client.tsx", "utf8");
assert.match(client, /setPreviousStepResult\(completed\)/);
const advanceCode = client.slice(client.indexOf("function resetAfterSuccess"), client.indexOf("function markStepPassed"));
assert.ok(advanceCode.indexOf("setRunResult(null)") < advanceCode.indexOf("setCurrentStepIndex"));
assert.match(advanceCode, /setRunResult\(null\)/);
assert.match(advanceCode, /setCurrentStepIndex/);
assert.match(client, /completedStepWithFeedback\(result, currentStepIndex, feedback\)/);
assert.match(client, /visiblePreviousStepResult && \(/);
assert.match(client, /Vừa hoàn thành bước \{visiblePreviousStepResult\.fromStepIndex \+ 1\}/);
assert.match(client, /Đầu ra của bước vừa xong/);
assert.match(client, /visiblePreviousStepResult\.runResult\.output\.map/);
assert.match(client, /const message = stepChanged\s*\? null/);
assert.match(client, /completedStepAnnouncement\(completed, step\.title\)/);
assert.match(client, /const completed = completedStepResult\(evaluation, currentStepIndex, lesson\.steps\.length, currentStep\.title, exec\)/);
assert.match(client, /runResult\?\.success && runResult\.output\.length > 0/);

console.log("lesson step transition tests passed");
