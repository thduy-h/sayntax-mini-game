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

// Render a parsed VoiceIntent as a short Vietnamese phrase for the
// "Mình hiểu là…" panel. Exhaustive — the never fallback guards against
// future VoiceIntent kinds being forgotten here.
export function describeIntent(intent: VoiceIntent): string {
  switch (intent.kind) {
    case "add_block": {
      const label = BLOCK_LABEL[intent.blockType] ?? intent.blockType;
      if (intent.position?.kind === "inside") {
        const parentLabel = BLOCK_LABEL[intent.position.parentHint] ?? intent.position.parentHint;
        return `thêm khối ${label} vào trong khối ${parentLabel}`;
      }
      return `thêm khối ${label}`;
    }
    case "insert_into": {
      if (!intent.parentHint) return "đặt vào trong khối cha";
      const parent = BLOCK_LABEL[intent.parentHint] ?? intent.parentHint;
      return `đặt vào trong khối ${parent}`;
    }
    case "set_text":
      return `đặt chữ "${intent.text}"`;
    case "set_number":
      return `đặt số ${intent.value}`;
    case "delete_last":
      return "xoá khối cuối";
    case "run_program":
      return "chạy chương trình";
    case "ask_hint":
      return "mở gợi ý";
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
    case "run_program":
      return "Chạy chương trình";
    case "ask_hint":
      return "Xin gợi ý";
    default:
      return null;
  }
}
