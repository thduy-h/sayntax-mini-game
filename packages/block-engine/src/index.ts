import type { ProgramExecutionResult, ProgramWorkspace, WorkspaceBlock } from "@shecancode/shared-types";

type PrimitiveValue = string | number | boolean;

export function evaluateReporter(
  block: WorkspaceBlock,
  variables: Record<string, PrimitiveValue>,
): PrimitiveValue {
  switch (block.type) {
    case "text_literal":
      return String(block.fields?.value ?? "");
    case "number_literal": {
      const value = Number(block.fields?.value ?? 0);
      return Number.isFinite(value) ? value : 0;
    }
    case "variable_get": {
      const variableName = String(block.fields?.name ?? "");
      return variables[variableName] ?? "";
    }
    default:
      throw new Error(`evaluateReporter does not handle non-reporter block kind: ${block.type}`);
  }
}

function resolveValue(
  block: WorkspaceBlock,
  fieldName: string,
  fallback: PrimitiveValue,
  variables: Record<string, PrimitiveValue>,
): PrimitiveValue {
  const inputBlock = block.inputs?.[fieldName];
  if (inputBlock) {
    return evaluateReporter(inputBlock, variables);
  }

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
      const value = resolveValue(block, "text", "", variables);
      output.push(String(value));
      return;
    }
    case "variable": {
      const name = String(resolveValue(block, "name", "bien", variables));
      const value = resolveValue(block, "value", "", variables);
      variables[name] = value;
      return;
    }
    case "repeat": {
      const timesValue = Number(resolveValue(block, "times", 0, variables));
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
      const condition = Boolean(resolveValue(block, "condition", false, variables));
      if (!condition) {
        return;
      }

      (block.children ?? []).forEach((child) => runBlock(child, output, variables, errors));
      return;
    }
    case "text_literal":
    case "number_literal":
    case "variable_get":
      // Reporter blocks only run via evaluateReporter, not as top-level statements.
      return;
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
