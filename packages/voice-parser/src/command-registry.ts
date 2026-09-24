import type { BlockKind } from "@shecancode/shared-types";
import type { ToolboxCategoryId, VoiceIntent } from "./parse-intent";

export type CommandRegistryId =
  | "add_start"
  | "add_print"
  | "add_repeat"
  | "add_if"
  | "add_variable"
  | "set_text"
  | "set_number"
  | "run_program"
  | "ask_hint"
  | "undo_last"
  | "select_block"
  | "set_insert_cursor"
  | "delete_block"
  | "pan_workspace"
  | "center_workspace"
  | "zoom_workspace"
  | "set_toolbox_visibility"
  | "open_toolbox_category";

export interface CommandDefinition {
  aliases: readonly string[];
  blockType?: BlockKind;
  canonical: string;
  category?: ToolboxCategoryId;
  id: CommandRegistryId;
  intentKind: VoiceIntent["kind"];
  requiredParameter?: "display_id" | "number" | "text";
}

export const COMMAND_REGISTRY = [
  {
    id: "add_start",
    intentKind: "add_block",
    blockType: "start",
    canonical: "thêm khối bắt đầu",
    aliases: ["them khoi bat dau", "khoi bat dau", "start", "bat dau"],
  },
  {
    id: "add_print",
    intentKind: "add_block",
    blockType: "print",
    canonical: "thêm khối in",
    aliases: ["them khoi in", "them lenh in", "them in", "in ra", "hien thi", "xuat ra", "noi"],
  },
  {
    id: "add_repeat",
    intentKind: "add_block",
    blockType: "repeat",
    canonical: "thêm khối lặp",
    aliases: ["them khoi lap", "them vong lap", "tao vong lap", "lap lai", "repeat"],
  },
  {
    id: "add_if",
    intentKind: "add_block",
    blockType: "if",
    canonical: "thêm khối điều kiện",
    aliases: ["them khoi dieu kien", "them khoi neu", "them cau lenh neu", "neu thi", "if"],
  },
  {
    id: "add_variable",
    intentKind: "add_block",
    blockType: "variable",
    canonical: "thêm biến",
    aliases: ["them bien", "tao bien", "bien moi", "dat bien", "them khoi bien"],
  },
  {
    id: "set_text",
    intentKind: "set_text",
    canonical: "đặt chữ",
    aliases: ["dat chu", "doi noi dung thanh", "sua chu thanh", "in chu", "in ra", "hien thi", "xuat ra"],
    requiredParameter: "text",
  },
  {
    id: "set_number",
    intentKind: "set_number",
    canonical: "đặt số",
    aliases: ["dat so", "doi so thanh", "sua so lan thanh", "lap lai", "dat so lan lap la"],
    requiredParameter: "number",
  },
  {
    id: "run_program",
    intentKind: "run_program",
    canonical: "chạy chương trình",
    aliases: ["chay chuong trinh", "chay thu", "chay code", "chay di", "chay"],
  },
  {
    id: "ask_hint",
    intentKind: "ask_hint",
    canonical: "gợi ý",
    aliases: ["goi y", "lam gi tiep", "giup em", "huong dan em", "em khong biet lam gi"],
  },
  {
    id: "undo_last",
    intentKind: "undo_last",
    canonical: "hoàn tác",
    aliases: ["hoan tac", "quay lai", "undo"],
  },
  {
    id: "select_block",
    intentKind: "select_block",
    canonical: "chọn khối",
    aliases: ["chon khoi", "chon khoi cuoi", "chon chuong trinh chinh"],
    requiredParameter: "display_id",
  },
  {
    id: "set_insert_cursor",
    intentKind: "set_insert_cursor",
    canonical: "chèn sau",
    aliases: ["chen sau", "chen truoc", "chen vao trong", "them o cuoi", "dat vi tri chen"],
  },
  {
    id: "delete_block",
    intentKind: "delete_block",
    canonical: "xoá khối",
    aliases: ["xoa khoi", "xoa cai nay", "bo khoi", "bo cai vua roi"],
  },
  {
    id: "pan_workspace",
    intentKind: "pan_workspace",
    canonical: "cuộn workspace",
    aliases: ["cuon len", "cuon xuong", "cuon sang trai", "cuon sang phai", "keo len", "keo xuong"],
  },
  {
    id: "center_workspace",
    intentKind: "center_workspace",
    canonical: "về giữa",
    aliases: ["ve giua", "dua ve giua", "can giua workspace", "dua khoi dang chon ve giua"],
  },
  {
    id: "zoom_workspace",
    intentKind: "zoom_workspace",
    canonical: "vừa màn hình",
    aliases: ["vua man hinh", "hien thi toan bo chuong trinh", "phong to", "thu nho", "dat lai zoom"],
  },
  {
    id: "set_toolbox_visibility",
    intentKind: "set_toolbox_visibility",
    canonical: "mở danh sách khối",
    aliases: ["mo danh sach khoi", "thu gon danh sach khoi", "dong danh sach khoi"],
  },
  {
    id: "open_toolbox_category",
    intentKind: "open_toolbox_category",
    canonical: "mở nhóm khối",
    aliases: ["mo nhom luong", "mo nhom dau ra", "mo nhom lap", "mo nhom dieu kien", "mo nhom gia tri", "mo nhom bien"],
  },
] as const satisfies readonly CommandDefinition[];

export function getSpeechRecognitionPhrases() {
  return Array.from(new Set(COMMAND_REGISTRY.flatMap((command) => [command.canonical, ...command.aliases])));
}
