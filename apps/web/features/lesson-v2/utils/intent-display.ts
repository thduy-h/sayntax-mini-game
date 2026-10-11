import type { LessonStepAction } from "@shecancode/lesson-engine";
import type { BlockKind } from "@shecancode/shared-types";
import type { VoiceIntent } from "@shecancode/voice-parser";

// Human-readable labels for block kinds — used when describing a parsed
// intent back to the learner and when deriving the "câu mẫu" chip.
export const BLOCK_LABEL: Partial<Record<BlockKind, string>> = {
  start: "bắt đầu",
  print: "in",
  repeat: "lặp",
  if: "điều kiện",
  variable: "biến",
};

const TOOLBOX_CATEGORY_LABEL: Record<string, string> = {
  condition: "Điều kiện",
  flow: "Luồng",
  loop: "Lặp",
  output: "Đầu ra",
  value: "Giá trị",
  variable: "Biến",
};

// Render a parsed VoiceIntent as a short Vietnamese phrase for the
// "Mình hiểu là…" panel. Exhaustive — the never fallback guards against
// future VoiceIntent kinds being forgotten here.
export function describeIntent(intent: VoiceIntent): string {
  switch (intent.kind) {
    case "add_block": {
      const label = BLOCK_LABEL[intent.blockType] ?? intent.blockType;
      const fieldText =
        intent.blockType === "repeat" && intent.fields?.times !== undefined
          ? ` ${intent.fields.times} lần`
          : intent.blockType === "print" && intent.fields?.variableName
            ? ` biến ${intent.fields.variableName}`
          : intent.blockType === "print" && intent.fields?.text
            ? ` chữ ${intent.fields.text}`
            : "";
      if (intent.position?.kind === "inside") {
        const parentLabel = BLOCK_LABEL[intent.position.parentHint] ?? intent.position.parentHint;
        return `thêm khối ${label}${fieldText} vào trong khối ${parentLabel}`;
      }
      return `thêm khối ${label}${fieldText}`;
    }
    case "insert_into": {
      if (!intent.parentHint) return "đặt vào trong khối cha";
      const parent = BLOCK_LABEL[intent.parentHint] ?? intent.parentHint;
      return `đặt vào trong khối ${parent}`;
    }
    case "select_block":
      if (intent.target === "main") return "chọn chương trình chính";
      if (intent.target === "last") return "chọn khối cuối";
      if (intent.target === "block_type") return `chọn khối ${BLOCK_LABEL[intent.blockType ?? "print"] ?? intent.blockType}${intent.ordinal ? ` thứ ${intent.ordinal}` : ""}`;
      return `chọn khối ${intent.displayId}`;
    case "set_insert_cursor":
      if (intent.target === "display_id" && intent.displayId) {
        return {
          after: `đặt vị trí chèn sau khối ${intent.displayId}`,
          before: `đặt vị trí chèn trước khối ${intent.displayId}`,
          end: "thêm ở cuối chương trình",
          inside: `đặt vị trí chèn vào trong khối ${intent.displayId}`,
        }[intent.position];
      }
      if (intent.target === "last") {
        return {
          after: "đặt vị trí chèn sau khối cuối",
          before: "đặt vị trí chèn trước khối cuối",
          end: "thêm ở cuối chương trình",
          inside: "đặt vị trí chèn vào trong khối cuối",
        }[intent.position];
      }
      if (intent.target === "main") {
        return {
          after: "đặt vị trí chèn sau chương trình chính",
          before: "đặt vị trí chèn trước chương trình chính",
          end: "thêm ở cuối chương trình",
          inside: "đặt vị trí chèn vào trong chương trình chính",
        }[intent.position];
      }
      return {
        after: "chèn sau khối đang chọn",
        before: "chèn trước khối đang chọn",
        end: "thêm ở cuối chương trình",
        inside: "chèn vào trong khối đang chọn",
      }[intent.position];
    case "query_position":
      return "hỏi vị trí hiện tại";
    case "set_text":
      return `đặt chữ "${intent.text}"`;
    case "set_number":
      return `đặt số ${intent.value}`;
    case "set_variable_output":
      return `in giá trị biến ${intent.name}`;
    case "delete_block":
      if (intent.target === "selected") return "xoá khối đang chọn";
      if (intent.target === "last") return "xoá khối vừa thao tác";
      return `xoá khối ${intent.displayId}`;
    case "delete_last":
      return "xoá khối cuối";
    case "move_block":
      return `di chuyển khối ${intent.displayId ?? "đang chọn"} ${
        { down: "xuống dưới", inside: `vào trong khối ${intent.parentDisplayId}`, outside: "ra ngoài", up: "lên trên" }[
          intent.direction
        ]
      }`;
    case "run_program":
      return "chạy chương trình";
    case "navigate_step":
      if (intent.target === "previous") return "về bước trước";
      if (intent.target === "next") return "sang bước sau";
      return `đến bước ${intent.stepNumber}`;
    case "ask_hint":
      return "mở gợi ý";
    case "check_work":
      return "kiểm tra bài";
    case "explain_block":
      return "giải thích khối đang chọn";
    case "confirm":
      return "đồng ý thực hiện";
    case "cancel":
      return "hủy thao tác";
    case "undo_last":
      return "hoàn tác thao tác gần nhất";
    case "pan_workspace":
      return {
        down: "cuộn workspace xuống",
        left: "cuộn workspace sang trái",
        right: "cuộn workspace sang phải",
        up: "cuộn workspace lên",
      }[intent.direction];
    case "center_workspace":
      if (intent.target === "selected_block") return "đưa khối đang chọn về giữa";
      if (intent.target === "display_id") return `đưa khối ${intent.displayId} về giữa`;
      return "đưa chương trình về giữa";
    case "zoom_workspace":
      return {
        fit: "hiển thị toàn bộ chương trình",
        in: "phóng to workspace",
        out: "thu nhỏ workspace",
        reset: "đặt lại zoom workspace",
      }[intent.level];
    case "set_toolbox_visibility":
      return intent.visible ? "mở danh sách khối" : "thu gọn danh sách khối";
    case "open_toolbox_category":
      return `mở nhóm khối ${TOOLBOX_CATEGORY_LABEL[intent.category] ?? intent.category}`;
    case "close_toolbox_category":
      return "đóng nhóm khối";
    case "unknown":
      return "chưa hiểu câu lệnh";
    default: {
      const _exhaustive: never = intent;
      return _exhaustive;
    }
  }
}

// Pull the first **bolded** segment out of a markdown-ish instruction string.
// The seed uses **...** to mark the exact phrase the learner should say.
export function extractSampleFromInstructions(text: string): string | null {
  const match = text.match(/\*\*([^*]+?)\*\*/);
  return match ? match[1].trim() : null;
}

/**
 * Split an instruction string into alternating plain / bold segments so the
 * UI can render **markdown** as real <strong> nodes instead of leaking the
 * literal asterisks into the rendered text. Returns an array of
 * `{ text, bold }` pairs preserving original order.
 */
export function splitBoldSegments(text: string): Array<{ text: string; bold: boolean }> {
  const segments: Array<{ text: string; bold: boolean }> = [];
  const regex = /\*\*([^*]+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }
  return segments;
}

// Fallback used when the instructions text has no **...** marker. Derives a
// natural Vietnamese phrase from the step's action so the chip is never empty
// on regular (non-challenge) steps.
export function deriveSampleUtterance(action: LessonStepAction): string | null {
  switch (action.kind) {
    case "add_block": {
      const label = BLOCK_LABEL[action.blockType] ?? action.blockType;
      return `Thêm khối ${label}`;
    }
    case "insert_into": {
      const parent = BLOCK_LABEL[action.parentBlockType] ?? action.parentBlockType;
      const child = BLOCK_LABEL[action.childBlockType] ?? action.childBlockType;
      return `Thêm khối ${child} vào trong khối ${parent}`;
    }
    case "set_text":
      return `Đặt chữ ${action.expectedText}`;
    case "set_number":
      return `Đặt số ${action.expectedNumber}`;
    case "set_variable_output":
      return `In biến ${action.variableName}`;
    case "run_program":
      return "Chạy chương trình";
    case "ask_hint":
      return "Xin gợi ý";
    default:
      return null;
  }
}
