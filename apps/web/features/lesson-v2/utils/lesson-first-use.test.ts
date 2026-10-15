import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lesson = readFileSync("features/lesson-v2/components/voice-lesson-client.tsx", "utf8");
const commandBar = readFileSync("features/voice-control/components/global-command-bar.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");
const demoPage = readFileSync("app/demo/[slug]/page.tsx", "utf8");
const studentPage = readFileSync("app/lessons-v2/[slug]/page.tsx", "utf8");

assert.ok(lesson.includes("{currentStep.title}</h2>"));
assert.ok(lesson.includes("Bắt đầu nói lệnh bài học"));
assert.ok(lesson.includes("<div ref={containerRef}"));
assert.ok(lesson.includes("Kiến thức nhanh"));
assert.ok(lesson.includes("Bắt đầu bài học"));
assert.ok(lesson.includes("Xem kiến thức"));
assert.ok(lesson.includes('window.dispatchEvent(new Event("scc:focus-command-bar"))'));
assert.ok(commandBar.includes('window.addEventListener("scc:focus-command-bar", focusCommandBar)'));
assert.ok(commandBar.includes("inWorkspace && !wasWorkspaceRef.current"));
assert.ok(commandBar.includes("Nhập lệnh, ví dụ:"));
assert.ok(lesson.includes("selectedBlockSummary"));
assert.ok(lesson.includes("setSelectedBlockSummary(selectedItem"));
assert.ok(lesson.includes("Blockly.common.getSelected()"));
assert.ok(lesson.includes("max-h-[calc(100dvh-1rem)]"));
assert.ok(lesson.includes("overflow-y-auto overscroll-contain"));
assert.ok(demoPage.includes("min-h-[calc(100dvh-var(--global-command-bar-height,0px))]"));
assert.ok(studentPage.includes("min-h-[calc(100dvh-var(--global-command-bar-height,0px))]"));
assert.ok(lesson.includes("Công cụ"));
assert.ok(commandBar.includes("scc-global-command-collapsed"));
assert.ok(globals.includes("@media (max-height: 500px)"));

console.log("lesson first-use contracts passed");
