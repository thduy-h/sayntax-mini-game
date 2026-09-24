import type { BlockKind, ProgramWorkspace, WorkspaceBlock } from "@shecancode/shared-types";

export type InsertCursorPosition = "before" | "after" | "inside" | "end";

export interface InsertCursor {
  workspaceId: string;
  targetBlockId: string | null;
  targetDisplayId?: string;
  position: InsertCursorPosition;
  inputName?: string;
}

export interface VoiceCursorDisplayItem {
  blockId: string;
  displayId: string;
  label: string;
  parentDisplayId?: string;
  type: BlockKind;
}

export interface VoiceCursorIndex {
  blockIdToDisplayId: Record<string, string>;
  displayIdToBlockId: Record<string, string>;
  items: VoiceCursorDisplayItem[];
}

export type SetInsertCursorCommand = {
  kind: "set_insert_cursor";
  position: InsertCursorPosition;
  target?: "selected" | "display_id" | "last" | "main";
  displayId?: string;
};

export type InsertCursorResolution =
  | { ok: true; cursor: InsertCursor; selectedBlockId: string | null; message: string }
  | { ok: false; cursor: InsertCursor; message: string };

function blockLabel(block: WorkspaceBlock) {
  switch (block.type) {
    case "start":
      return "Khi bắt đầu";
    case "print": {
      const input = block.inputs?.text;
      if (input?.type === "variable_get") return `In biến ${String(input.fields?.name ?? "")}`.trim();
      if (input?.type === "text_literal") return `In "${String(input.fields?.value ?? "")}"`;
      const text = block.fields?.text;
      return text ? `In "${String(text)}"` : "In";
    }
    case "repeat":
      return `Lặp ${Number(block.fields?.times ?? 0)} lần`;
    case "if":
      return "Nếu điều kiện";
    case "variable":
      return `Đặt ${String(block.fields?.name ?? "biến")} = ${String(block.fields?.value ?? "")}`;
    case "variable_get":
      return `Biến ${String(block.fields?.name ?? "")}`.trim();
    case "text_literal":
      return `"${String(block.fields?.value ?? "")}"`;
    case "number_literal":
      return String(block.fields?.value ?? 0);
    case "boolean_literal":
      return block.fields?.value === false ? "Sai" : "Đúng";
    default:
      return block.type;
  }
}

function visitBlock(
  block: WorkspaceBlock,
  displayId: string,
  items: VoiceCursorDisplayItem[],
  parentDisplayId?: string,
) {
  items.push({
    blockId: block.id,
    displayId,
    label: blockLabel(block),
    parentDisplayId,
    type: block.type,
  });

  (block.children ?? []).forEach((child, index) => {
    visitBlock(child, `${displayId}.${index + 1}`, items, displayId);
  });
}

export function buildVoiceCursorIndex(workspace: ProgramWorkspace): VoiceCursorIndex {
  const items: VoiceCursorDisplayItem[] = [];
  workspace.blocks.forEach((block, index) => {
    visitBlock(block, String(index + 1), items);
  });

  return {
    blockIdToDisplayId: Object.fromEntries(items.map((item) => [item.blockId, item.displayId])),
    displayIdToBlockId: Object.fromEntries(items.map((item) => [item.displayId, item.blockId])),
    items,
  };
}

function itemSupportsInside(item: VoiceCursorDisplayItem) {
  return item.type === "repeat" || item.type === "if";
}

function cursorLabel(cursor: InsertCursor) {
  if (cursor.position === "end") return "cuối chương trình";
  const target = cursor.targetDisplayId ? `khối ${cursor.targetDisplayId}` : "khối đang chọn";
  return {
    after: `sau ${target}`,
    before: `trước ${target}`,
    inside: `bên trong ${target}`,
    end: "cuối chương trình",
  }[cursor.position];
}

export function resolveInsertCursorCommand(
  items: VoiceCursorDisplayItem[],
  currentCursor: InsertCursor,
  command: SetInsertCursorCommand,
  selectedBlockId: string | null,
): InsertCursorResolution {
  if (command.position === "end") {
    const cursor = { workspaceId: currentCursor.workspaceId, targetBlockId: null, position: "end" as const };
    return { ok: true, cursor, selectedBlockId, message: "Đã đặt vị trí chèn cuối chương trình." };
  }

  let target: VoiceCursorDisplayItem | undefined;
  if (command.target === "display_id") {
    target = items.find((item) => item.displayId === command.displayId);
    if (!target) {
      return {
        ok: false,
        cursor: currentCursor,
        message: `Không tìm thấy khối ${command.displayId}. Vị trí chèn hiện tại không bị thay đổi.`,
      };
    }
  } else if (command.target === "last") {
    target = items[items.length - 1];
  } else if (command.target === "main") {
    target = items.find((item) => item.type === "start");
  } else {
    target = selectedBlockId ? items.find((item) => item.blockId === selectedBlockId) : undefined;
  }

  if (!target) {
    return { ok: false, cursor: currentCursor, message: "Hãy chọn một khối trước. Ví dụ: chọn khối 2." };
  }
  if (command.position === "inside" && !itemSupportsInside(target)) {
    return {
      ok: false,
      cursor: currentCursor,
      message: `Khối ${target.displayId} không hỗ trợ chèn vào trong. Em có thể chèn trước hoặc chèn sau khối này.`,
    };
  }

  const cursor: InsertCursor = {
    inputName: command.position === "inside" ? "DO" : undefined,
    position: command.position,
    targetBlockId: target.blockId,
    targetDisplayId: target.displayId,
    workspaceId: currentCursor.workspaceId,
  };
  return {
    ok: true,
    cursor,
    selectedBlockId: target.blockId,
    message: `Đã đặt vị trí chèn ${cursorLabel(cursor)}.`,
  };
}
