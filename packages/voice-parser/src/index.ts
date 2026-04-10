import type { BlockKind, VoiceCommandAction } from "@shecancode/shared-types";

export interface VoiceParseResult {
  normalizedTranscript: string;
  success: boolean;
  action: VoiceCommandAction;
}

export const SUPPORTED_COMMAND_PATTERNS = [
  "thêm khối bắt đầu",
  "thêm khối in",
  "thêm khối lặp 3 lần",
  "thêm khối điều kiện",
  "thêm biến",
  "xóa khối cuối",
  "chạy chương trình",
  "đặt giá trị 5",
  "đọc hướng dẫn",
  "kiểm tra đáp án",
] as const;

function stripVietnameseDiacritics(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function normalizeForMatching(transcript: string) {
  return stripVietnameseDiacritics(transcript.trim().toLowerCase())
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^(hay|lam on|lam on hay|giup minh|cho minh)\s+/, "")
    .trim();
}

export function normalizeTranscript(transcript: string): string {
  return transcript.trim().toLowerCase().replace(/\s+/g, " ");
}

function unsupported(normalizedTranscript: string, reason: string): VoiceParseResult {
  return {
    normalizedTranscript,
    success: false,
    action: {
      type: "unsupported",
      reason,
    },
  };
}

function addBlockAction(normalizedTranscript: string, blockType: BlockKind, repeatCount?: number): VoiceParseResult {
  return {
    normalizedTranscript,
    success: true,
    action: {
      type: "add_block",
      blockType,
      repeatCount,
    },
  };
}

export function parseVoiceCommand(transcript: string): VoiceParseResult {
  const normalizedTranscript = normalizeTranscript(transcript);
  const matchingTranscript = normalizeForMatching(transcript);

  if (!normalizedTranscript) {
    return unsupported(normalizedTranscript, "Không có nội dung giọng nói.");
  }

  if (/^them (khoi )?bat dau$/.test(matchingTranscript)) {
    return addBlockAction(normalizedTranscript, "start");
  }

  if (/^them (khoi )?in( ra)?$/.test(matchingTranscript)) {
    return addBlockAction(normalizedTranscript, "print");
  }

  if (/^them (khoi )?dieu kien$/.test(matchingTranscript)) {
    return addBlockAction(normalizedTranscript, "if");
  }

  if (/^them (khoi )?bien$/.test(matchingTranscript)) {
    return addBlockAction(normalizedTranscript, "variable");
  }

  const repeatMatch = matchingTranscript.match(/^them (khoi )?lap (\d+) lan$/);
  if (repeatMatch) {
    const repeatCount = Number(repeatMatch[2]);
    return addBlockAction(normalizedTranscript, "repeat", repeatCount);
  }

  if (/^xoa khoi cuoi( cung)?$/.test(matchingTranscript)) {
    return {
      normalizedTranscript,
      success: true,
      action: { type: "delete_last_block" },
    };
  }

  if (/^chay chuong trinh$/.test(matchingTranscript)) {
    return {
      normalizedTranscript,
      success: true,
      action: { type: "run_program" },
    };
  }

  const setValueMatch = matchingTranscript.match(/^dat gia tri( la)? ([0-9]+)$/);
  if (setValueMatch) {
    return {
      normalizedTranscript,
      success: true,
      action: {
        type: "set_selected_block_value",
        value: Number(setValueMatch[2]),
      },
    };
  }

  if (/^doc huong dan$/.test(matchingTranscript)) {
    return {
      normalizedTranscript,
      success: true,
      action: { type: "read_instructions" },
    };
  }

  if (/^kiem tra dap an$/.test(matchingTranscript)) {
    return {
      normalizedTranscript,
      success: true,
      action: { type: "check_answer" },
    };
  }

  return unsupported(normalizedTranscript, "Lệnh này hiện chưa được hỗ trợ trong phiên bản đầu tiên.");
}
