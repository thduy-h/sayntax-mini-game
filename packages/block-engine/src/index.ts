import type { ProgramExecutionResult, ProgramWorkspace, WorkspaceBlock } from "@shecancode/shared-types";

type PrimitiveValue = string | number | boolean;

function readField(block: WorkspaceBlock, fieldName: string, fallback: PrimitiveValue) {
  return block.fields?.[fieldName] ?? fallback;
}

function runBlock(
  block: WorkspaceBlock,
  output: string[],
  variables: Record<string, PrimitiveValue>,
  errors: string[],
) {
  switch (block.type) {
    case "start":
      return;
    case "print": {
      const value = readField(block, "text", "");
      output.push(String(value));
      return;
    }
    case "variable": {
      const name = String(readField(block, "name", "bien"));
      const value = readField(block, "value", "");
      variables[name] = value;
      return;
    }
    case "repeat": {
      const timesValue = Number(readField(block, "times", 0));
      if (!Number.isFinite(timesValue) || timesValue < 0) {
        errors.push("Số lần lặp không hợp lệ.");
        return;
      }

      const nestedBlocks = block.children ?? [];
      for (let index = 0; index < timesValue; index += 1) {
        nestedBlocks.forEach((child) => runBlock(child, output, variables, errors));
      }
      return;
    }
    case "if": {
      const condition = Boolean(readField(block, "condition", false));
      if (!condition) {
        return;
      }

      (block.children ?? []).forEach((child) => runBlock(child, output, variables, errors));
      return;
    }
    default:
      errors.push(`Khối không được hỗ trợ: ${block.type}`);
  }
}

export function createEmptyProgram(): ProgramWorkspace {
  return {
    version: 1,
    blocks: [],
  };
}

export function countWorkspaceBlocks(workspace: ProgramWorkspace): number {
  return workspace.blocks.length;
}

export function executeProgram(workspace: ProgramWorkspace): ProgramExecutionResult {
  const errors: string[] = [];
  const output: string[] = [];
  const variables: Record<string, PrimitiveValue> = {};

  if (!workspace.blocks.length) {
    return {
      errors: ["Workspace chưa có khối nào."],
      output,
      success: false,
      variables,
    };
  }

  const hasStartBlock = workspace.blocks.some((block) => block.type === "start");
  if (!hasStartBlock) {
    errors.push("Chương trình cần có khối bắt đầu.");
  }

  workspace.blocks.forEach((block) => runBlock(block, output, variables, errors));

  return {
    errors,
    output,
    success: errors.length === 0,
    variables,
  };
}
