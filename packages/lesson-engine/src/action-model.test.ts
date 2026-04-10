import assert from "node:assert/strict";

import type {
  ProgramExecutionResult,
  ProgramWorkspace,
  WorkspaceBlock,
} from "@shecancode/shared-types";

import type { LessonStepAction } from "./action-model";
import { evaluateStepAction } from "./action-model";

const FEEDBACK = {
  add_block_pass: "Bạn đã thêm đúng khối cần thiết.",
  add_block_fail: "Bạn vẫn chưa thêm khối được yêu cầu.",
  insert_into_pass: "Khối con đã nằm đúng bên trong khối cha.",
  insert_into_fail: "Hãy kéo khối con vào bên trong khối cha.",
  set_text_pass: "Nội dung văn bản đã đúng.",
  set_text_fail: "Nội dung văn bản chưa khớp với yêu cầu.",
  set_number_pass: "Giá trị số đã đúng.",
  set_number_fail: "Giá trị số chưa đúng với yêu cầu.",
  run_program_pass: "Chương trình đã chạy thành công.",
  run_program_fail: "Chương trình chưa chạy đúng như mong đợi.",
  ask_hint_pass: "Bạn đã mở gợi ý — tiếp tục nhé!",
} as const;

function workspace(blocks: WorkspaceBlock[]): ProgramWorkspace {
  return { version: 1, blocks };
}

function result(overrides: Partial<ProgramExecutionResult> = {}): ProgramExecutionResult {
  return { errors: [], output: [], success: true, variables: {}, ...overrides };
}

function exhaustiveCheck(action: LessonStepAction): LessonStepAction["kind"] {
  switch (action.kind) {
    case "add_block":
    case "insert_into":
    case "set_text":
    case "set_number":
    case "run_program":
    case "ask_hint":
      return action.kind;
    default: {
      const _never: never = action;
      return _never;
    }
  }
}

assert.equal(exhaustiveCheck({ kind: "ask_hint" }), "ask_hint");

const printBlock: WorkspaceBlock = { id: "print-1", type: "print", fields: { text: "Xin chào", count: 5 } };

assert.deepEqual(evaluateStepAction({ kind: "add_block", blockType: "print" }, workspace([{ id: "1", type: "print" }]), result()), { completed: true, feedback: FEEDBACK.add_block_pass });
assert.deepEqual(
  evaluateStepAction({ kind: "add_block", blockType: "print" }, workspace([{ id: "1", type: "repeat", children: [{ id: "2", type: "print" }] }]), result()),
  { completed: true, feedback: FEEDBACK.add_block_pass },
);
assert.deepEqual(evaluateStepAction({ kind: "add_block", blockType: "print" }, workspace([]), result()), { completed: false, feedback: FEEDBACK.add_block_fail });
assert.deepEqual(evaluateStepAction({ kind: "add_block", blockType: "print" }, workspace([{ id: "1", type: "start" }]), result()), { completed: false, feedback: FEEDBACK.add_block_fail });

assert.deepEqual(
  evaluateStepAction({ kind: "insert_into", parentBlockType: "repeat", childBlockType: "print" }, workspace([{ id: "1", type: "repeat", children: [{ id: "2", type: "print" }] }]), result()),
  { completed: true, feedback: FEEDBACK.insert_into_pass },
);
assert.deepEqual(
  evaluateStepAction({ kind: "insert_into", parentBlockType: "repeat", childBlockType: "print" }, workspace([{ id: "1", type: "repeat", children: [] }]), result()),
  { completed: false, feedback: FEEDBACK.insert_into_fail },
);
assert.deepEqual(
  evaluateStepAction({ kind: "insert_into", parentBlockType: "repeat", childBlockType: "print" }, workspace([{ id: "1", type: "start" }]), result()),
  { completed: false, feedback: FEEDBACK.insert_into_fail },
);
assert.deepEqual(
  evaluateStepAction({ kind: "insert_into", parentBlockType: "repeat", childBlockType: "print" }, workspace([{ id: "1", type: "repeat", children: [{ id: "2", type: "variable" }] }]), result()),
  { completed: false, feedback: FEEDBACK.insert_into_fail },
);

assert.deepEqual(evaluateStepAction({ kind: "set_text", blockId: "print-1", field: "text", expectedText: "Xin chào" }, workspace([printBlock]), result()), { completed: true, feedback: FEEDBACK.set_text_pass });
assert.deepEqual(evaluateStepAction({ kind: "set_text", blockId: "print-1", field: "text", expectedText: "Tạm biệt" }, workspace([printBlock]), result()), { completed: false, feedback: FEEDBACK.set_text_fail });
assert.deepEqual(evaluateStepAction({ kind: "set_text", blockId: "missing", field: "text", expectedText: "Xin chào" }, workspace([printBlock]), result()), { completed: false, feedback: FEEDBACK.set_text_fail });
assert.deepEqual(evaluateStepAction({ kind: "set_text", blockId: "print-1", field: "missing", expectedText: "Xin chào" }, workspace([printBlock]), result()), { completed: false, feedback: FEEDBACK.set_text_fail });
assert.deepEqual(evaluateStepAction({ kind: "set_text", blockId: "print-1", field: "text", expectedText: "xin chào" }, workspace([printBlock]), result()), { completed: false, feedback: FEEDBACK.set_text_fail });

assert.deepEqual(evaluateStepAction({ kind: "set_number", blockId: "print-1", field: "count", expectedNumber: 5 }, workspace([printBlock]), result()), { completed: true, feedback: FEEDBACK.set_number_pass });
assert.deepEqual(
  evaluateStepAction({ kind: "set_number", blockId: "print-2", field: "count", expectedNumber: 5 }, workspace([{ id: "print-2", type: "print", fields: { count: "5" } }]), result()),
  { completed: true, feedback: FEEDBACK.set_number_pass },
);
assert.deepEqual(
  evaluateStepAction({ kind: "set_number", blockId: "print-3", field: "count", expectedNumber: 5 }, workspace([{ id: "print-3", type: "print", fields: { count: "abc" } }]), result()),
  { completed: false, feedback: FEEDBACK.set_number_fail },
);
assert.deepEqual(evaluateStepAction({ kind: "set_number", blockId: "print-1", field: "count", expectedNumber: 6 }, workspace([printBlock]), result()), { completed: false, feedback: FEEDBACK.set_number_fail });
assert.deepEqual(evaluateStepAction({ kind: "set_number", blockId: "missing", field: "count", expectedNumber: 5 }, workspace([printBlock]), result()), { completed: false, feedback: FEEDBACK.set_number_fail });

assert.deepEqual(evaluateStepAction({ kind: "run_program" }, workspace([]), result()), { completed: true, feedback: FEEDBACK.run_program_pass });
assert.deepEqual(
  evaluateStepAction({ kind: "run_program", expectedOutput: ["Xin chào", "Bạn làm được!"] }, workspace([]), result({ output: ["xin chao", "ban lam duoc!"] })),
  { completed: true, feedback: FEEDBACK.run_program_pass },
);
assert.deepEqual(evaluateStepAction({ kind: "run_program" }, workspace([]), result({ success: false })), { completed: false, feedback: FEEDBACK.run_program_fail });
assert.deepEqual(
  evaluateStepAction({ kind: "run_program", expectedOutput: ["Xin chào", "Bạn làm được!"] }, workspace([]), result({ output: ["Xin chào"] })),
  { completed: false, feedback: FEEDBACK.run_program_fail },
);
assert.deepEqual(
  evaluateStepAction({ kind: "run_program", expectedOutput: ["Xin chào", "Bạn làm được!"] }, workspace([]), result({ output: ["Xin chào", "Sai rồi"] })),
  { completed: false, feedback: FEEDBACK.run_program_fail },
);

assert.deepEqual(evaluateStepAction({ kind: "ask_hint" }, workspace([]), result({ success: false })), { completed: true, feedback: FEEDBACK.ask_hint_pass });

console.log("action-model tests passed");
