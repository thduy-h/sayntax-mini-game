import assert from "node:assert/strict";
import { runCompletionModalCommand } from "./completion-modal-command";

const actions: string[] = [];
const handlers = {
  next: () => actions.push("next"),
  list: () => actions.push("list"),
  restart: () => actions.push("restart"),
};

assert.equal(runCompletionModalCommand("Bài tiếp theo", true, handlers), "next");
assert.equal(runCompletionModalCommand("mở bài tiếp theo", true, handlers), "next");
assert.equal(runCompletionModalCommand("Danh sách bài", true, handlers), "list");
assert.equal(runCompletionModalCommand("Về danh sách bài", true, handlers), "list");
assert.equal(runCompletionModalCommand("làm lại bài này", true, handlers), "restart");
assert.deepEqual(actions, ["next", "next", "list", "list", "restart"]);

assert.equal(runCompletionModalCommand("bài tiếp theo", false, handlers), null, "next is unavailable after the last lesson");
for (const blocked of ["thêm khối in", "chạy chương trình", "xóa tất cả", "đúng rồi", "hủy", "cuộn xuống", "mở admin", ""]) {
  assert.equal(runCompletionModalCommand(blocked, true, handlers), null);
}
assert.equal(actions.length, 5, "blocked commands must not execute any action");
assert.equal(runCompletionModalCommand("làm lại", false, handlers), "restart");
assert.equal(runCompletionModalCommand("danh sách bài", false, handlers), "list");

console.log("completion-modal-command tests passed");
