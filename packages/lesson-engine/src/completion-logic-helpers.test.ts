import { strict as assert } from "node:assert";
import type { LessonCompletionLogic } from "@shecancode/shared-types";
import { isBlockStructureCompletionLogic } from "./completion-logic-helpers";

const cases: Array<{ logic: LessonCompletionLogic; expected: boolean }> = [
  { logic: { type: "required_block_types", blockTypes: ["start"] }, expected: true },
  { logic: { type: "ordered_block_types", blockTypes: ["start", "print"] }, expected: true },
  { logic: { type: "max_top_level_blocks", blockTypes: ["print"], max: 1 }, expected: true },
  { logic: { type: "variable_name", name: "score" }, expected: true },
  { logic: { type: "print_text", text: "hello" }, expected: false },
  { logic: { type: "print_sequence", texts: ["a", "b"] }, expected: false },
  { logic: { type: "repeat_print", count: 3, text: "loop" }, expected: false },
  { logic: { type: "if_print", text: "yes" }, expected: false },
  { logic: { type: "variable_value", name: "score", value: 10 }, expected: false },
  { logic: { type: "variable_then_print", name: "score", value: 10 }, expected: false },
];

for (const { logic, expected } of cases) {
  assert.equal(isBlockStructureCompletionLogic(logic), expected, logic.type);
}

console.log("completion-logic-helpers tests passed");
