import assert from "node:assert/strict";

import type { ProgramExecutionResult, ProgramWorkspace, WorkspaceBlock } from "@shecancode/shared-types";

import { evaluateStepCompletion } from "./evaluate-step";

function workspace(blocks: WorkspaceBlock[]): ProgramWorkspace {
  return { version: 1, blocks };
}

function result(output: string[]): ProgramExecutionResult {
  return { errors: [], output, success: true, variables: {} };
}

assert.deepEqual(
  evaluateStepCompletion({ type: "required_block_types", blockTypes: ["start", "print"] }, workspace([{ id: "1", type: "start" }, { id: "2", type: "print" }]), result([])),
  { completed: true, feedback: "Bạn đã thêm đúng các khối cần thiết cho bước này." },
);
assert.deepEqual(
  evaluateStepCompletion({ type: "required_block_types", blockTypes: ["start", "print"] }, workspace([{ id: "1", type: "start" }]), result([])),
  { completed: false, feedback: "Bước này vẫn thiếu một số khối quan trọng. Hãy nhìn lại gợi ý bên phải." },
);
assert.deepEqual(
  evaluateStepCompletion({ type: "ordered_block_types", blockTypes: ["start", "print"] }, workspace([{ id: "1", type: "start" }, { id: "2", type: "print" }]), result([])),
  { completed: true, feedback: "Thứ tự khối đã đúng. Bạn có thể tiếp tục." },
);
assert.deepEqual(
  evaluateStepCompletion({ type: "ordered_block_types", blockTypes: ["start", "print"] }, workspace([{ id: "1", type: "print" }, { id: "2", type: "start" }]), result([])),
  { completed: false, feedback: "Các khối chính chưa nằm đúng thứ tự từ trên xuống dưới." },
);
assert.deepEqual(
  evaluateStepCompletion({ type: "max_top_level_blocks", blockTypes: ["start", "repeat"], max: 2 }, workspace([{ id: "1", type: "start" }, { id: "2", type: "repeat" }]), result([])),
  { completed: true, feedback: "Lời giải gọn và đúng. Bạn đang dùng vòng lặp hiệu quả." },
);
assert.deepEqual(
  evaluateStepCompletion({ type: "variable_name", name: "score" }, workspace([{ id: "1", type: "variable", fields: { name: " score " } }]), result([])),
  { completed: true, feedback: "Bạn đã tạo đúng biến cần dùng trong bài." },
);

assert.deepEqual(
  evaluateStepCompletion({ type: "print_text", text: "Xin chào" }, workspace([]), result(["xin chao"])),
  { completed: true, feedback: "Đầu ra đã khớp với mục tiêu của bài." },
);
assert.deepEqual(
  evaluateStepCompletion({ type: "print_text", text: "Xin chào" }, workspace([]), result(["Tạm biệt"])),
  { completed: false, feedback: "Đầu ra chưa khớp với thông điệp cần in." },
);
assert.deepEqual(
  evaluateStepCompletion({ type: "print_sequence", texts: ["Xin chào", "Bạn làm được!"] }, workspace([]), result(["xin chao", "ban lam duoc!"])),
  { completed: true, feedback: "Bạn đã in đúng chuỗi thông điệp theo thứ tự." },
);
assert.deepEqual(
  evaluateStepCompletion({ type: "repeat_print", count: 3, text: "Tap" }, workspace([]), result(["Tap", "Tap"])),
  { completed: false, feedback: "Vòng lặp chưa cho ra đúng số lần hoặc đúng thông điệp." },
);
assert.deepEqual(
  evaluateStepCompletion({ type: "if_print", text: "Trời sáng" }, workspace([{ id: "1", type: "if", children: [{ id: "2", type: "print", fields: { text: "troi sang" } }] }]), result(["Trời sáng"])),
  { completed: true, feedback: "Khối điều kiện đã chứa đúng hành động cần thực hiện." },
);
assert.deepEqual(
  evaluateStepCompletion({ type: "variable_value", name: "score", value: 5 }, workspace([{ id: "1", type: "variable", fields: { name: "score", value: "5" } }]), result([])),
  { completed: true, feedback: "Biến đã được gán đúng giá trị." },
);
assert.deepEqual(
  evaluateStepCompletion({ type: "variable_then_print", name: "score", value: 5 }, workspace([{ id: "1", type: "variable", fields: { name: "score", value: "5" } }]), result(["5"])),
  { completed: true, feedback: "Bạn đã lưu và dùng lại giá trị của biến đúng cách." },
);

console.log("evaluate-step tests passed");
