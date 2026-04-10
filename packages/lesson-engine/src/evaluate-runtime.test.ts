import assert from "node:assert/strict";

import type { LessonCompletionLogic, ProgramExecutionResult, ProgramWorkspace, WorkspaceBlock } from "@shecancode/shared-types";

import { evaluateRuntimeLogic } from "./evaluate-runtime";

function workspace(blocks: WorkspaceBlock[]): ProgramWorkspace {
  return { version: 1, blocks };
}

function result(output: string[]): ProgramExecutionResult {
  return { errors: [], output, success: true, variables: {} };
}

assert.equal(evaluateRuntimeLogic({ type: "print_text", text: "  Xin chào  " }, workspace([]), result(["xin   chao"])), true);
assert.equal(evaluateRuntimeLogic({ type: "print_text", text: "Xin chào" }, workspace([]), result(["Xin chào", "extra"])), false);
assert.equal(evaluateRuntimeLogic({ type: "print_text", text: "Xin chào" }, workspace([]), result(["Tạm biệt"])), false);

assert.equal(
  evaluateRuntimeLogic({ type: "print_sequence", texts: ["Xin chào", "Bạn làm được!"] }, workspace([]), result(["xin chao", "ban lam duoc!"])),
  true,
);
assert.equal(
  evaluateRuntimeLogic({ type: "print_sequence", texts: ["Xin chào", "Bạn làm được!"] }, workspace([]), result(["Bạn làm được!", "Xin chào"])),
  false,
);

assert.equal(evaluateRuntimeLogic({ type: "repeat_print", count: 3, text: "Lặp lại" }, workspace([]), result(["lap lai", "lap lai", "lap lai"])), true);
assert.equal(evaluateRuntimeLogic({ type: "repeat_print", count: 3, text: "Lặp lại" }, workspace([]), result(["lap lai", "lap lai"])), false);

const ifWorkspace = workspace([
  {
    id: "if-1",
    type: "if",
    children: [
      { id: "print-1", type: "print", fields: { text: "  trời sáng " } },
      { id: "print-2", type: "print", fields: { text: "khác" } },
    ],
  },
]);
assert.equal(evaluateRuntimeLogic({ type: "if_print", text: "Troi sang" }, ifWorkspace, result(["troi sang"])), true);
assert.equal(
  evaluateRuntimeLogic(
    { type: "if_print", text: "Troi sang" },
    workspace([{ id: "if-2", type: "if", children: [{ id: "print-3", type: "print", fields: { text: "khác" } }] }]),
    result(["troi sang"]),
  ),
  false,
);
assert.equal(evaluateRuntimeLogic({ type: "if_print", text: "Troi sang" }, ifWorkspace, result(["sai output"])), false);

const variableWorkspace = workspace([{ id: "var-1", type: "variable", fields: { name: "score", value: 5 } }]);
assert.equal(evaluateRuntimeLogic({ type: "variable_value", name: "score", value: 5 }, variableWorkspace, result([])), true);
assert.equal(
  evaluateRuntimeLogic(
    { type: "variable_value", name: "score", value: 5 },
    workspace([{ id: "var-2", type: "variable", fields: { name: " score ", value: "5" } }]),
    result([]),
  ),
  true,
);
assert.equal(evaluateRuntimeLogic({ type: "variable_value", name: "score", value: 7 }, variableWorkspace, result([])), false);

const variableThenPrintWorkspace = workspace([{ id: "var-3", type: "variable", fields: { name: "score", value: "5" } }]);
assert.equal(evaluateRuntimeLogic({ type: "variable_then_print", name: "score", value: 5 }, variableThenPrintWorkspace, result(["5"])), true);
assert.equal(
  evaluateRuntimeLogic({ type: "variable_then_print", name: "score", value: 5 }, variableThenPrintWorkspace, result(["6"])),
  false,
);

const unsupportedLogic: LessonCompletionLogic = { type: "required_block_types", blockTypes: ["start"] };
assert.throws(
  () => evaluateRuntimeLogic(unsupportedLogic, workspace([]), result([])),
  /evaluateRuntimeLogic does not handle block-structure variant: required_block_types/,
);

console.log("evaluate-runtime tests passed");
