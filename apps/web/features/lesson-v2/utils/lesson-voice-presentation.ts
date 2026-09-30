import type { ASRState } from "@/features/voice-control/asr/types";
import type { GlobalCommandExecutionResult } from "@/features/voice-control/utils/global-command-routing";

type VoiceOutcome = GlobalCommandExecutionResult["outcome"];

export interface LessonVoicePresentation {
  label: string;
  tone: "ready" | "active" | "working" | "success" | "warning";
}

export function lessonVoicePresentation(input: {
  asrState: ASRState;
  errorMessage: string | null;
  isSupportKnown: boolean;
  isSupported: boolean;
  outcome: VoiceOutcome;
  privacyAcknowledged: boolean;
}): LessonVoicePresentation {
  if (!input.privacyAcknowledged) return { label: "Đọc thông tin micro để bật giọng nói", tone: "warning" };
  if (!input.isSupportKnown || input.asrState === "checking") return { label: "Đang kiểm tra giọng nói", tone: "working" };
  if (!input.isSupported || input.errorMessage) return { label: "Giọng nói chưa sẵn sàng — có thể nhập lệnh", tone: "warning" };
  if (input.asrState === "processing") return { label: "Đang xử lý lời nói", tone: "working" };
  if (input.asrState === "starting") return { label: "Đang mở micro", tone: "working" };
  if (input.asrState === "listening") return { label: "Micro đang nghe", tone: "active" };
  if (input.outcome === "pending") return { label: "Đang chờ xác nhận", tone: "warning" };
  if (input.outcome === "applied") return { label: "Lệnh đã thực hiện", tone: "success" };
  if (input.outcome === "not_applied" || input.outcome === "unsupported") {
    return { label: "Lệnh chưa thực hiện — xem phản hồi", tone: "warning" };
  }
  return { label: "Sẵn sàng nghe lệnh", tone: "ready" };
}
