import assert from "node:assert/strict";

import type { ProgramWorkspace } from "@shecancode/shared-types";

import { buildVoiceCursorIndex, resolveInsertCursorCommand, type InsertCursor } from "./voice-cursor";

const workspace: ProgramWorkspace = {
  version: 1,
  blocks: [
    { id: "start", type: "start" },
    { id: "repeat", type: "repeat", fields: { times: 3 }, children: [
      { id: "print-inner", type: "print", inputs: { text: { id: "text", type: "text_literal", fields: { value: "Xin chào" } } } },
      { id: "print-var", type: "print", inputs: { text: { id: "get", type: "variable_get", fields: { name: "diem" } } } },
    ] },
    { id: "print-final", type: "print", fields: { text: "Hoàn thành" } },
  ],
};

const index = buildVoiceCursorIndex(workspace);

assert.deepEqual(index.displayIdToBlockId, {
  "1": "start",
  "2": "repeat",
  "2.1": "print-inner",
  "2.2": "print-var",
  "3": "print-final",
});
assert.equal(index.blockIdToDisplayId["print-inner"], "2.1");
assert.equal(index.items.find((item) => item.displayId === "2")?.label, "Lặp 3 lần");
assert.equal(index.items.find((item) => item.displayId === "2.1")?.label, 'In "Xin chào"');
assert.equal(index.items.find((item) => item.displayId === "2.2")?.label, "In biến diem");

const currentCursor: InsertCursor = { position: "after", targetBlockId: "repeat", targetDisplayId: "2", workspaceId: "demo" };

const afterBlockOne = resolveInsertCursorCommand(index.items, currentCursor, {
  kind: "set_insert_cursor",
  position: "after",
  target: "display_id",
  displayId: "1",
}, "repeat");
assert.equal(afterBlockOne.ok, true);
assert.deepEqual(afterBlockOne.ok ? afterBlockOne.cursor : null, {
  inputName: undefined,
  position: "after",
  targetBlockId: "start",
  targetDisplayId: "1",
  workspaceId: "demo",
});

const missingBlock = resolveInsertCursorCommand(index.items, currentCursor, {
  kind: "set_insert_cursor",
  position: "after",
  target: "display_id",
  displayId: "99",
}, "repeat");
assert.equal(missingBlock.ok, false);
assert.deepEqual(missingBlock.ok ? null : missingBlock.cursor, currentCursor);
assert.equal(missingBlock.message, "Không tìm thấy khối 99. Vị trí chèn hiện tại không bị thay đổi.");

const invalidInside = resolveInsertCursorCommand(index.items, currentCursor, {
  kind: "set_insert_cursor",
  position: "inside",
  target: "display_id",
  displayId: "1",
}, "repeat");
assert.equal(invalidInside.ok, false);
assert.deepEqual(invalidInside.ok ? null : invalidInside.cursor, currentCursor);
assert.equal(invalidInside.message, "Khối 1 không hỗ trợ chèn vào trong. Em có thể chèn trước hoặc chèn sau khối này.");

const validInside = resolveInsertCursorCommand(index.items, currentCursor, {
  kind: "set_insert_cursor",
  position: "inside",
  target: "display_id",
  displayId: "2",
}, "start");
assert.equal(validInside.ok, true);
assert.equal(validInside.ok ? validInside.cursor.targetBlockId : null, "repeat");
assert.equal(validInside.ok ? validInside.cursor.inputName : null, "DO");

console.log("voice-cursor tests passed");
