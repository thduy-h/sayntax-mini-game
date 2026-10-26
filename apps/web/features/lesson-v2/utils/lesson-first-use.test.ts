import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lesson = readFileSync("features/lesson-v2/components/voice-lesson-client.tsx", "utf8");
const commandBar = readFileSync("features/voice-control/components/global-command-bar.tsx", "utf8");
const globalVoice = readFileSync("features/voice-control/components/global-voice-control.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");
const demoPage = readFileSync("app/demo/[slug]/page.tsx", "utf8");
const studentPage = readFileSync("app/lessons-v2/[slug]/page.tsx", "utf8");

assert.ok(lesson.includes("{currentStep.title}</h2>"));
assert.ok(globalVoice.includes('id="voice-activation"'));
assert.ok(lesson.includes("<div ref={containerRef}"));
assert.ok(lesson.includes("Kiến thức nhanh"));
assert.ok(lesson.includes("Bắt đầu bài học"));
assert.ok(lesson.includes("Xem kiến thức"));
assert.ok(lesson.includes('role="tablist"'));
assert.ok(lesson.includes('id="tab-knowledge"'));
assert.ok(lesson.includes('id="tab-practice"'));
assert.ok(commandBar.includes('[DEV] Nhập lệnh'));
assert.ok(commandBar.includes('Alt+G'));
assert.ok(commandBar.includes('window.addEventListener("scc:focus-command-bar", focusCommandBar)'));
assert.ok(commandBar.includes("Nhập lệnh, ví dụ:"));
assert.ok(lesson.includes("selectedBlockSummary"));
assert.ok(lesson.includes("setSelectedBlockSummary(selectedItem"));
assert.ok(lesson.includes("Blockly.common.getSelected()"));
assert.ok(lesson.includes("max-h-[calc(100dvh-1rem)]"));
assert.ok(lesson.includes("overflow-y-auto overscroll-contain"));
assert.ok(demoPage.includes("min-h-[calc(100dvh-var(--global-command-bar-height,0px))]"));
assert.ok(studentPage.includes("min-h-[calc(100dvh-var(--global-command-bar-height,0px))]"));
assert.ok(lesson.includes("Công cụ"));
assert.ok(commandBar.includes("if (hiddenForModal || collapsed) return null;"));
assert.ok(globals.includes("@media (max-height: 500px)"));

assert.ok(lesson.includes("isPrimerOpen"));
assert.ok(lesson.includes("hasStartedLesson"));
assert.ok(lesson.includes("scc_lesson_started:"));
assert.ok(lesson.includes("scrollPrimer"));
assert.ok(lesson.includes("Đã cuộn kiến thức nhanh xuống."));
assert.ok(lesson.includes("Đã cuộn kiến thức nhanh lên."));
assert.ok(lesson.includes("Đã về đầu nội dung kiến thức nhanh."));
assert.ok(lesson.includes("Đã xuống cuối nội dung kiến thức nhanh."));
assert.ok(lesson.includes("Nội dung ngắn, không cần cuộn."));
assert.ok(lesson.includes("document.body.style.overflow = \"hidden\""));
assert.ok(lesson.includes("aria-describedby=\"lesson-primer-desc\""));
assert.ok(lesson.includes("Ôn lại kiến thức"));
assert.ok(lesson.includes("Tiếp tục học →"));
assert.ok(lesson.includes("Đóng kiến thức nhanh"));
assert.ok(lesson.includes("primerCanScrollDown"));
assert.ok(lesson.includes("modalOpen: false"));

console.log("lesson first-use contracts passed");

