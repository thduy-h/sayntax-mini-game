import type { ProgramExecutionResult, ProgramWorkspace, WorkspaceBlock } from "@shecancode/shared-types";

type PrimitiveValue = string | number | boolean;
const MAX_EXECUTION_STEPS = 10_000;
const MAX_NESTING_DEPTH = 64;
const MAX_OUTPUT_LINES = 1_000;

interface ExecutionBudget { remaining: number }

function consumeStep(budget: ExecutionBudget, errors: string[]) {
  if (budget.remaining <= 0) {
    if (!errors.includes("Chương trình vượt giới hạn chạy an toàn.")) errors.push("Chương trình vượt giới hạn chạy an toàn.");
    return false;
  }
  budget.remaining -= 1;
  return true;
}

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
    case "boolean_literal":
      return Boolean(block.fields?.value ?? false);
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
  budget: ExecutionBudget,
  depth = 0,
) {
  if (depth > MAX_NESTING_DEPTH) {
    errors.push("Chương trình lồng quá nhiều khối.");
    return;
  }
  if (!consumeStep(budget, errors)) return;
  switch (block.type) {
    case "start":
      return;
    case "print": {
      if (output.length >= MAX_OUTPUT_LINES) {
        errors.push("Chương trình tạo quá nhiều dòng đầu ra.");
        return;
      }
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
        if (!consumeStep(budget, errors)) break;
        for (const child of nestedBlocks) {
          if (errors.length) break;
          runBlock(child, output, variables, errors, budget, depth + 1);
        }
        if (errors.length) break;
      }
      return;
    }
    case "if": {
      const condition = Boolean(resolveValue(block, "condition", false, variables));
      if (!condition) {
        return;
      }

      for (const child of block.children ?? []) {
        if (errors.length) break;
        runBlock(child, output, variables, errors, budget, depth + 1);
      }
      return;
    }
    case "text_literal":
    case "number_literal":
    case "boolean_literal":
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
  const budget: ExecutionBudget = { remaining: MAX_EXECUTION_STEPS };

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

  for (const block of workspace.blocks) {
    if (errors.length) break;
    runBlock(block, output, variables, errors, budget);
  }

  return {
    errors,
    output,
    success: errors.length === 0,
    variables,
  };
}
