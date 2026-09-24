import assert from "node:assert/strict";

import {
  chooseGlobalCommandTarget,
  createGlobalCommandRegistry,
  type GlobalCommandExecutionResult,
} from "./global-command-routing";

function website(command: string): GlobalCommandExecutionResult {
  return { command, feedback: `website:${command}`, handled: true, target: "website", understoodAs: command === "quay lại" ? "history:back" : command === "cuộn xuống" ? "scroll:down" : "website" };
}

assert.equal(chooseGlobalCommandTarget(null), "website");
assert.equal(chooseGlobalCommandTarget({
  handleTextCommand: website,
  id: "a",
  lessonSlug: "lesson-a",
  lessonTitle: "Lesson A",
  modalOpen: false,
  workspaceReady: false,
}), "workspace_not_ready");
assert.equal(chooseGlobalCommandTarget({
  handleTextCommand: website,
  id: "a",
  lessonSlug: "lesson-a",
  lessonTitle: "Lesson A",
  modalOpen: true,
  workspaceReady: true,
}), "modal_blocked");

const registry = createGlobalCommandRegistry();
let websiteCalls = 0;
let workspaceCalls = 0;

const outsideBack = registry.submit("quay lại", (command) => {
  websiteCalls += 1;
  return website(command);
});
assert.equal(outsideBack.target, "website");
assert.equal(outsideBack.understoodAs, "history:back");

const unregisterA = registry.register({
  handleTextCommand: (command) => {
    workspaceCalls += 1;
    return { command, feedback: `workspace:${command}`, handled: true, target: "workspace", understoodAs: command === "quay lại" ? "undo_last" : command === "cuộn xuống" ? "pan_workspace:down" : "lesson" };
  },
  id: "lesson-a:step-1",
  lessonSlug: "lesson-a",
  lessonTitle: "Lesson A",
  modalOpen: false,
  sampleUtterance: "thêm khối bắt đầu",
  workspaceReady: true,
});

const workspaceBack = registry.submit("quay lại", website);
assert.equal(workspaceBack.target, "workspace");
assert.equal(workspaceBack.understoodAs, "undo_last");

const workspacePan = registry.submit("cuộn xuống", website);
assert.equal(workspacePan.target, "workspace");
assert.equal(workspacePan.understoodAs, "pan_workspace:down");
assert.equal(workspaceCalls, 2);
assert.equal(websiteCalls, 1);
assert.equal(registry.getWorkspace()?.sampleUtterance, "thêm khối bắt đầu");

const unregisterB = registry.register({
  handleTextCommand: (command) => {
    workspaceCalls += 10;
    return { command, feedback: `workspace-b:${command}`, handled: true, target: "workspace", understoodAs: "lesson-b" };
  },
  id: "lesson-b:step-1",
  lessonSlug: "lesson-b",
  lessonTitle: "Lesson B",
  modalOpen: false,
  workspaceReady: true,
});

unregisterA();
assert.equal(registry.getWorkspace()?.lessonSlug, "lesson-b");
assert.equal(registry.submit("thêm khối in", website).understoodAs, "lesson-b");
unregisterB();
assert.equal(registry.submit("cuộn xuống", website).target, "website");

registry.register({
  handleTextCommand: website,
  id: "lesson-c:step-1",
  lessonSlug: "lesson-c",
  lessonTitle: "Lesson C",
  modalOpen: false,
  workspaceReady: false,
});
assert.equal(registry.submit("thêm khối bắt đầu", website).feedback, "Workspace đang khởi tạo. Vui lòng thử lại sau giây lát.");

registry.register({
  handleTextCommand: website,
  id: "lesson-c:step-2",
  lessonSlug: "lesson-c",
  lessonTitle: "Lesson C",
  modalOpen: true,
  workspaceReady: true,
});
assert.equal(registry.submit("chạy chương trình", website).target, "modal_blocked");

console.log("global-command-routing tests passed");
