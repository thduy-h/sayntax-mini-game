import assert from "node:assert/strict";

import { lessonVoicePresentation } from "./lesson-voice-presentation";

const ready = {
  asrState: "idle" as const,
  errorMessage: null,
  isSupportKnown: true,
  isSupported: true,
  outcome: undefined,
  privacyAcknowledged: true,
};

assert.deepEqual(lessonVoicePresentation(ready), { label: "Sẵn sàng nghe lệnh", tone: "ready" });
assert.equal(lessonVoicePresentation({ ...ready, privacyAcknowledged: false }).tone, "warning");
assert.deepEqual(lessonVoicePresentation({ ...ready, asrState: "listening" }), { label: "Đang nghe", tone: "active" });
assert.deepEqual(lessonVoicePresentation({ ...ready, asrState: "processing" }), { label: "Đang xử lý", tone: "working" });
assert.equal(lessonVoicePresentation({ ...ready, asrState: "starting" }).label, "Đang mở micro");
assert.equal(lessonVoicePresentation({ ...ready, isSupportKnown: false }).tone, "working");
assert.equal(lessonVoicePresentation({ ...ready, isSupported: false }).tone, "warning");
assert.equal(lessonVoicePresentation({ ...ready, errorMessage: "Micro bị chặn" }).tone, "warning");
assert.deepEqual(lessonVoicePresentation({ ...ready, outcome: "applied" }), { label: "Lệnh đã thực hiện", tone: "success" });
assert.equal(lessonVoicePresentation({ ...ready, outcome: "not_applied" }).tone, "warning");
assert.equal(lessonVoicePresentation({ ...ready, outcome: "unsupported" }).tone, "warning");
assert.equal(lessonVoicePresentation({ ...ready, outcome: "pending" }).label, "Đang chờ xác nhận");

console.log("lesson voice presentation tests passed");
