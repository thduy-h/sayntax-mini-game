import type { BlockKind, LessonCompletionLogic, ProgramWorkspace, WorkspaceBlock } from "@shecancode/shared-types";

function someBlock(blocks: WorkspaceBlock[], predicate: (block: WorkspaceBlock) => boolean): boolean {
  return blocks.some((block) => predicate(block) || someBlock(block.children ?? [], predicate));
}

function includesOrderedTypes(blocks: WorkspaceBlock[], blockTypes: BlockKind[]): boolean {
  let nextIndex = 0;
  for (const block of blocks) {
    if (block.type === blockTypes[nextIndex]) nextIndex += 1;
  }
  return nextIndex === blockTypes.length;
}

export function evaluateBlockStructureLogic(logic: LessonCompletionLogic, workspace: ProgramWorkspace): boolean {
  switch (logic.type) {
    case "required_block_types":
      return logic.blockTypes.every((blockType) => someBlock(workspace.blocks, (block) => block.type === blockType));

    case "ordered_block_types":
      return includesOrderedTypes(workspace.blocks, logic.blockTypes);

    case "max_top_level_blocks": {
      const allowedTypes = new Set<BlockKind>(logic.blockTypes);
      const count = workspace.blocks.filter((block) => allowedTypes.has(block.type)).length;
      return count <= logic.max;
    }

    case "variable_name": {
      const expectedName = logic.name.trim();
      return someBlock(
        workspace.blocks,
        (block) => block.type === "variable" && typeof block.fields?.name === "string" && block.fields.name.trim() === expectedName,
      );
    }

    case "print_text":
    case "print_sequence":
    case "repeat_print":
    case "if_print":
    case "variable_value":
    case "variable_then_print":
      throw new Error(`evaluateBlockStructureLogic does not handle runtime logic variant: ${logic.type}`);

    default: {
      const _exhaustive: never = logic;
      return _exhaustive;
    }
  }
}
