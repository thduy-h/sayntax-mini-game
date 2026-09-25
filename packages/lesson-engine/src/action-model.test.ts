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
  insert_into_pass: "Khối con đã nằm đúng bên trong khối cha.",
  set_text_pass: "Nội dung văn bản đã đúng.",
  set_number_pass: "Giá trị số đã đúng.",
  run_program_pass: "Tốt lắm, chương trình đã chạy đúng.",
  run_program_fail: "Chương trình chưa chạy đúng như mong đợi. Hãy kiểm tra các khối rồi chạy lại.",
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
    case "set_variable_output":
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
assert.deepEqual(evaluateStepAction({ kind: "add_block", blockType: "print" }, workspace([]), result()), { completed: false, feedback: "Bạn còn thiếu khối in. Hãy nói hoặc nhập: thêm khối in." });
assert.deepEqual(evaluateStepAction({ kind: "add_block", blockType: "print" }, workspace([{ id: "1", type: "start" }]), result()), { completed: false, feedback: "Bạn còn thiếu khối in. Hãy nói hoặc nhập: thêm khối in." });
assert.deepEqual(
  evaluateStepAction(
    { kind: "add_block", blockType: "print", minimumCount: 2 },
    workspace([{ id: "1", type: "print" }]),
    result(),
  ),
  { completed: false, feedback: "Bạn cần 2 khối in. Hiện có 1. Hãy thêm một khối in nữa." },
);
assert.deepEqual(
  evaluateStepAction(
    { kind: "add_block", blockType: "print", minimumCount: 2 },
    workspace([{ id: "1", type: "print" }, { id: "2", type: "print" }]),
    result(),
  ),
  { completed: true, feedback: FEEDBACK.add_block_pass },
);

assert.deepEqual(
  evaluateStepAction({ kind: "insert_into", parentBlockType: "repeat", childBlockType: "print" }, workspace([{ id: "1", type: "repeat", children: [{ id: "2", type: "print" }] }]), result()),
  { completed: true, feedback: FEEDBACK.insert_into_pass },
);
assert.deepEqual(
  evaluateStepAction({ kind: "insert_into", parentBlockType: "repeat", childBlockType: "print" }, workspace([{ id: "1", type: "repeat", children: [] }]), result()),
  { completed: false, feedback: "Bạn còn thiếu khối in để đưa vào bên trong." },
);
assert.deepEqual(
  evaluateStepAction({ kind: "insert_into", parentBlockType: "repeat", childBlockType: "print" }, workspace([{ id: "1", type: "start" }]), result()),
  { completed: false, feedback: "Bạn cần thêm một khối lặp trước." },
);
assert.deepEqual(
  evaluateStepAction({ kind: "insert_into", parentBlockType: "repeat", childBlockType: "print" }, workspace([{ id: "1", type: "repeat", children: [{ id: "2", type: "variable" }] }]), result()),
  { completed: false, feedback: "Bạn còn thiếu khối in để đưa vào bên trong." },
);

// set_text is ID-agnostic but must match the expected text.
const printBlockEmpty: WorkspaceBlock = { id: "print-empty", type: "print", fields: { text: "" } };
const printBlockReporter: WorkspaceBlock = {
  id: "print-rep",
  type: "print",
  inputs: { text: { id: "lit-1", type: "text_literal", fields: { value: "Bất kỳ" } } },
};
assert.deepEqual(evaluateStepAction({ kind: "set_text", blockId: "print-1", field: "text", expectedText: "Xin chào" }, workspace([printBlock]), result()), { completed: true, feedback: FEEDBACK.set_text_pass });
assert.deepEqual(evaluateStepAction({ kind: "set_text", blockId: "print-1", field: "text", expectedText: "Tạm biệt" }, workspace([printBlock]), result()), {
  completed: false,
  feedback: "Bạn đã có nội dung rồi, nhưng chưa đúng. Hãy nói: đổi nội dung thành Tạm biệt.",
});
// Mismatched blockId still passes if SOME block has the field — ID is ignored.
assert.deepEqual(evaluateStepAction({ kind: "set_text", blockId: "missing", field: "text", expectedText: "Xin chào" }, workspace([printBlock]), result()), { completed: true, feedback: FEEDBACK.set_text_pass });
assert.deepEqual(evaluateStepAction({ kind: "set_text", blockId: "print-1", field: "text", expectedText: "Xin chào" }, workspace([]), result()), {
  completed: false,
  feedback: "Bạn còn thiếu nội dung chữ. Hãy nói: đặt chữ Xin chào.",
});
assert.deepEqual(evaluateStepAction({ kind: "set_text", blockId: "print-empty", field: "text", expectedText: "anything" }, workspace([printBlockEmpty]), result()), {
  completed: false,
  feedback: "Bạn còn thiếu nội dung chữ. Hãy nói: đặt chữ anything.",
});
assert.deepEqual(evaluateStepAction({ kind: "set_text", blockId: "print-1", field: "nonexistent", expectedText: "x" }, workspace([printBlock]), result()), {
  completed: false,
  feedback: "Bạn còn thiếu nội dung chữ. Hãy nói: đặt chữ x.",
});
// Reporter sub-block (text_literal) is read for the value.
assert.deepEqual(evaluateStepAction({ kind: "set_text", blockId: "print-rep", field: "text", expectedText: "Bất kỳ" }, workspace([printBlockReporter]), result()), { completed: true, feedback: FEEDBACK.set_text_pass });

// set_number is ID-agnostic but must match the expected number.
assert.deepEqual(evaluateStepAction({ kind: "set_number", blockId: "print-1", field: "count", expectedNumber: 5 }, workspace([printBlock]), result()), { completed: true, feedback: FEEDBACK.set_number_pass });
assert.deepEqual(
  evaluateStepAction({ kind: "set_number", blockId: "print-2", field: "count", expectedNumber: 5 }, workspace([{ id: "print-2", type: "print", fields: { count: "5" } }]), result()),
  { completed: true, feedback: FEEDBACK.set_number_pass },
);
assert.deepEqual(evaluateStepAction({ kind: "set_number", blockId: "print-1", field: "count", expectedNumber: 6 }, workspace([printBlock]), result()), {
  completed: false,
  feedback: "Giá trị số chưa đúng. Hãy nói: đặt số 6.",
});
// Mismatched blockId still passes if some block has a finite number.
assert.deepEqual(evaluateStepAction({ kind: "set_number", blockId: "missing", field: "count", expectedNumber: 5 }, workspace([printBlock]), result()), { completed: true, feedback: FEEDBACK.set_number_pass });
// Non-numeric string fails (NaN).
assert.deepEqual(
  evaluateStepAction({ kind: "set_number", blockId: "print-3", field: "count", expectedNumber: 5 }, workspace([{ id: "print-3", type: "print", fields: { count: "abc" } }]), result()),
  { completed: false, feedback: "Giá trị số chưa đúng. Hãy nói: đặt số 5." },
);
// Empty workspace fails.
assert.deepEqual(evaluateStepAction({ kind: "set_number", blockId: "print-1", field: "count", expectedNumber: 5 }, workspace([]), result()), {
  completed: false,
  feedback: "Giá trị số chưa đúng. Hãy nói: đặt số 5.",
});
// Reporter sub-block (number_literal) is read for the value.
const repeatRep: WorkspaceBlock = {
  id: "repeat-rep",
  type: "repeat",
  inputs: { times: { id: "n-1", type: "number_literal", fields: { value: 7 } } },
};
assert.deepEqual(evaluateStepAction({ kind: "set_number", blockId: "repeat-rep", field: "times", expectedNumber: 7 }, workspace([repeatRep]), result()), { completed: true, feedback: FEEDBACK.set_number_pass });

// Variable output is distinct from printing the literal text "diem".
const printVariable: WorkspaceBlock = {
  id: "print-var",
  type: "print",
  inputs: { text: { id: "get-diem", type: "variable_get", fields: { name: "diem" } } },
};
const printLiteralVariableName: WorkspaceBlock = {
  id: "print-lit",
  type: "print",
  inputs: { text: { id: "lit-diem", type: "text_literal", fields: { value: "diem" } } },
};
assert.deepEqual(evaluateStepAction({ kind: "set_variable_output", blockId: "print-var", variableName: "diem" }, workspace([printVariable]), result()), {
  completed: true,
  feedback: "Khối in đã lấy đúng giá trị của biến.",
});
assert.deepEqual(evaluateStepAction({ kind: "set_variable_output", blockId: "print-var", variableName: "diem" }, workspace([printLiteralVariableName]), result()), {
  completed: false,
  feedback: "Em đang in chữ 'diem', nhưng bài này muốn in giá trị của biến diem. Hãy nói: in biến diem.",
});

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
assert.deepEqual(
  evaluateStepAction({ kind: "run_program", expectedOutput: ["10"] }, workspace([]), result({ output: ["diem"] })),
  { completed: false, feedback: "Chương trình đang in 'diem', nhưng cần in '10'. Hãy kiểm tra khối in và biến." },
);

assert.deepEqual(evaluateStepAction({ kind: "ask_hint" }, workspace([]), result({ success: false })), { completed: true, feedback: FEEDBACK.ask_hint_pass });

console.log("action-model tests passed");
