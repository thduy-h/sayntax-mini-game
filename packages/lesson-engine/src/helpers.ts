import type { WorkspaceBlock } from "@shecancode/shared-types";

export function flattenBlocks(blocks: WorkspaceBlock[]): WorkspaceBlock[] {
  return blocks.flatMap((block) => [block, ...flattenBlocks(block.children ?? [])]);
}

export function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

export function comparableValue(value: string | number | boolean) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const num = Number(trimmed);
    if (trimmed !== "" && Number.isFinite(num)) return num;
    return normalizeText(trimmed);
  }
  return value;
}

export function findVariableBlock(blocks: WorkspaceBlock[], expectedName: string) {
  const normalizedName = normalizeText(expectedName);
  return blocks.find(
    (block) =>
      block.type === "variable" &&
      typeof block.fields?.name === "string" &&
      normalizeText(block.fields.name) === normalizedName,
  );
}

export function validatePrintText(output: string[], text: string) {
  return output.length === 1 && normalizeText(output[0] ?? "") === normalizeText(text);
}
