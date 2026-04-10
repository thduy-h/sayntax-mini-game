import type { LessonCompletionLogic } from "@shecancode/shared-types";

export function isBlockStructureCompletionLogic(logic: LessonCompletionLogic): boolean {
  switch (logic.type) {
    case "required_block_types":
    case "ordered_block_types":
    case "max_top_level_blocks":
    case "variable_name":
      return true;
    case "print_text":
    case "print_sequence":
    case "repeat_print":
    case "if_print":
    case "variable_value":
    case "variable_then_print":
      return false;
    default: {
      const _exhaustive: never = logic;
      return _exhaustive;
    }
  }
}
