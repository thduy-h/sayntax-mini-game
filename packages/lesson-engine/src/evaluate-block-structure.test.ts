import { strict as assert } from "node:assert";
import type { LessonCompletionLogic, ProgramWorkspace, WorkspaceBlock } from "@shecancode/shared-types";
import { evaluateBlockStructureLogic } from "./evaluate-block-structure";

function block(id: string, type: WorkspaceBlock["type"], children?: WorkspaceBlock[], fields?: WorkspaceBlock["fields"]): WorkspaceBlock {
  return { id, type, ...(fields ? { fields } : {}), ...(children ? { children } : {}) };
}

function workspace(blocks: WorkspaceBlock[]): ProgramWorkspace {
  return { version: 1, blocks };
}

const passFailCases: Array<{ logic: LessonCompletionLogic; pass: ProgramWorkspace; fail: ProgramWorkspace }> = [
  {
    logic: { type: "required_block_types", blockTypes: ["start", "print", "variable"] },
    pass: workspace([block("1", "start", [block("2", "print"), block("3", "repeat", [block("4", "variable")])])]),
    fail: workspace([block("1", "start", [block("2", "print")])]),
  },
  {
    logic: { type: "ordered_block_types", blockTypes: ["start", "print", "if"] },
    pass: workspace([block("1", "start"), block("2", "repeat"), block("3", "print"), block("4", "variable"), block("5", "if")]),
    fail: workspace([block("1", "start"), block("2", "if"), block("3", "print")]),
  },
  {
    logic: { type: "max_top_level_blocks", blockTypes: ["print", "repeat"], max: 2 },
    pass: workspace([block("1", "start"), block("2", "print"), block("3", "if", [block("4", "print")]), block("5", "repeat")]),
    fail: workspace([block("1", "print"), block("2", "repeat"), block("3", "if"), block("4", "print")]),
  },
  {
    logic: { type: "variable_name", name: "score" },
    pass: workspace([block("1", "repeat", [block("2", "variable", undefined, { name: "  score  " })])]),
    fail: workspace([block("1", "variable", undefined, { name: "scores" })]),
  },
];

for (const { logic, pass, fail } of passFailCases) {
  assert.equal(evaluateBlockStructureLogic(logic, pass), true, `${logic.type} should pass`);
  assert.equal(evaluateBlockStructureLogic(logic, fail), false, `${logic.type} should fail`);
}

assert.throws(
  () => evaluateBlockStructureLogic({ type: "print_text", text: "hello" }, workspace([])),
  /evaluateBlockStructureLogic does not handle runtime logic variant: print_text/,
);

console.log("evaluate-block-structure tests passed");
