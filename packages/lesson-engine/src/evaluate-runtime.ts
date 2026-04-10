import type {
  LessonCompletionLogic,
  ProgramExecutionResult,
  ProgramWorkspace,
} from "@shecancode/shared-types";

import { comparableValue, findVariableBlock, flattenBlocks, normalizeText, validatePrintText } from "./helpers";

export function evaluateRuntimeLogic(
  logic: LessonCompletionLogic,
  workspace: ProgramWorkspace,
  executionResult: ProgramExecutionResult,
): boolean {
  const allBlocks = flattenBlocks(workspace.blocks);

  switch (logic.type) {
    case "print_text":
      return validatePrintText(executionResult.output, logic.text);
    case "print_sequence":
      return (
        executionResult.output.length === logic.texts.length &&
        logic.texts.every((text, index) => normalizeText(executionResult.output[index] ?? "") === normalizeText(text))
      );
    case "repeat_print": {
      const expected = Array(logic.count).fill(logic.text);
      return (
        executionResult.output.length === expected.length &&
        expected.every((text, index) => normalizeText(executionResult.output[index] ?? "") === normalizeText(text))
      );
    }
    case "if_print": {
      const ifBlock = allBlocks.find((block) => block.type === "if");
      const childPrint = ifBlock?.children?.find((child) => child.type === "print");
      const matchesChild =
        typeof childPrint?.fields?.text === "string" &&
        normalizeText(childPrint.fields.text) === normalizeText(logic.text);
      return validatePrintText(executionResult.output, logic.text) && matchesChild;
    }
    case "variable_value": {
      const variableBlock = findVariableBlock(allBlocks, logic.name);
      return comparableValue(variableBlock?.fields?.value as string | number | boolean) === comparableValue(logic.value);
    }
    case "variable_then_print": {
      const variableBlock = findVariableBlock(allBlocks, logic.name);
      const variableMatches =
        comparableValue(variableBlock?.fields?.value as string | number | boolean) === comparableValue(logic.value);
      return variableMatches && validatePrintText(executionResult.output, String(logic.value));
    }
    case "required_block_types":
    case "ordered_block_types":
    case "max_top_level_blocks":
    case "variable_name":
      throw new Error(`evaluateRuntimeLogic does not handle block-structure variant: ${logic.type}`);
    default: {
      const _exhaustive: never = logic;
      return _exhaustive;
    }
  }
}
