import assert from "node:assert/strict";

import {
  calculateWorkspacePanTarget,
  clampWorkspaceScale,
  createsProgramUndoSnapshot,
  requiresVoiceConfirmation,
  shouldEvaluateLessonAfterIntent,
} from "./workspace-viewport";

const metrics = { viewHeight: 500, viewLeft: 100, viewTop: 200, viewWidth: 800 };

assert.deepEqual(calculateWorkspacePanTarget(metrics, "up"), { x: 100, y: -100 });
assert.deepEqual(calculateWorkspacePanTarget(metrics, "down"), { x: 100, y: 500 });
assert.deepEqual(calculateWorkspacePanTarget(metrics, "left"), { x: -380, y: 200 });
assert.deepEqual(calculateWorkspacePanTarget(metrics, "right"), { x: 580, y: 200 });
assert.equal(clampWorkspaceScale(1.8, 0.7, 0.85), 0.85);
assert.equal(clampWorkspaceScale(0.4, 0.7, 0.85), 0.7);
assert.equal(clampWorkspaceScale(0.8, 0.7, 0.85), 0.8);

assert.equal(requiresVoiceConfirmation({ kind: "pan_workspace", direction: "down" }), false);
assert.equal(requiresVoiceConfirmation({ kind: "delete_block", target: "display_id", displayId: "2" }), true);

assert.equal(createsProgramUndoSnapshot({ kind: "zoom_workspace", level: "fit" }), false);
assert.equal(createsProgramUndoSnapshot({ kind: "set_toolbox_visibility", visible: true }), false);
assert.equal(createsProgramUndoSnapshot({ kind: "add_block", blockType: "print" }), true);

assert.equal(shouldEvaluateLessonAfterIntent({ kind: "center_workspace", target: "workspace" }), false);
assert.equal(shouldEvaluateLessonAfterIntent({ kind: "open_toolbox_category", category: "loop" }), false);
assert.equal(shouldEvaluateLessonAfterIntent({ kind: "set_text", text: "Xin chào" }), true);

console.log("workspace-viewport tests passed");
