import type { ProgramExecutionResult } from "@shecancode/shared-types";
import type { GlobalCommandExecutionResult } from "./global-command-routing";

export interface SpeechAnnouncementState {
  errorMessage: string | null;
  isListening: boolean;
  isSupportKnown: boolean;
  isSupported: boolean;
}

export function speechStatusAnnouncement(
  previous: SpeechAnnouncementState | null,
  current: SpeechAnnouncementState,
  fallback: string,
): string | null {
  if (current.isSupportKnown && !current.isSupported && (!previous || !previous.isSupportKnown || previous.isSupported)) {
    return `Nhận dạng giọng nói không khả dụng. ${fallback}`;
  }
  if (current.errorMessage && current.errorMessage !== previous?.errorMessage) {
    return `${current.errorMessage} ${fallback}`;
  }
  if (!previous) return null;
  if (current.isListening && !previous.isListening) return "Micro đang nghe.";
  if (!current.isListening && previous.isListening) return "Đã dừng nghe.";
  return null;
}

export function conciseAnnouncement(message: string): string {
  const trimmed = message.trim();
  if (/^(Đã nghe:|Hệ thống nghe chưa chắc)/i.test(trimmed)) {
    return "Hệ thống chưa chắc câu lệnh. Hãy nói lại hoặc nhập lệnh.";
  }
  return trimmed.length > 220 ? `${trimmed.slice(0, 217).trimEnd()}…` : trimmed;
}

export function commandFeedbackAnnouncement(result: Pick<GlobalCommandExecutionResult, "feedback" | "pendingPreview">): string {
  return conciseAnnouncement(result.pendingPreview || result.feedback);
}

export function programResultAnnouncement(result: ProgramExecutionResult, feedback: string | null): string {
  const outcome = result.success
    ? result.output.length > 0
      ? `Đầu ra: ${result.output[0]}.`
      : "Chương trình chạy xong, không có đầu ra."
    : `Chương trình chạy lỗi. ${result.errors[0] ?? "Hãy kiểm tra chương trình."}`;
  return conciseAnnouncement([feedback, outcome].filter(Boolean).join(" "));
}

export function distinctAnnouncement(previous: string, next: string | null, repeatEvent = false): string | null {
  const message = next?.trim() ?? "";
  return message && (repeatEvent || message !== previous) ? message : null;
}
