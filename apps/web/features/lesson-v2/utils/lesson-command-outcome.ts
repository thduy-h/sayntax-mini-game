import type { VoiceIntent } from "@shecancode/voice-parser";

export type LessonCommandOutcome = "applied" | "not_applied" | "unsupported" | "pending";

export function unknownCommandRecovery(input: {
  cursorLabel: string;
  sampleUtterance?: string | null;
  selectableBlockCount: number;
}) {
  if (input.selectableBlockCount > 0) {
    return `Mình chưa hiểu câu lệnh này. Vị trí chèn vẫn là ${input.cursorLabel}. Bạn có thể nói: chọn khối 2, chèn sau khối 2, hoặc gợi ý.`;
  }
  const sample = input.sampleUtterance?.trim();
  return sample
    ? `Mình chưa hiểu câu lệnh này. Vùng xếp khối còn trống. Bạn có thể nói: “${sample}”, hoặc “gợi ý”.`
    : "Mình chưa hiểu câu lệnh này. Vùng xếp khối còn trống. Hãy thêm khối phù hợp với bước hiện tại hoặc nói “gợi ý”.";
}

export function nextLessonHint(hints: readonly string[], currentIndex: number) {
  if (hints.length === 0) return null;
  const index = (currentIndex + 1) % hints.length;
  const hint = hints[index];
  if (!hint?.trim()) return null;
  const feedback = hints.length === 1
    ? `Đây là gợi ý duy nhất: ${hint}`
    : index === 0
      ? `Đã xem hết gợi ý mới. Xem lại gợi ý đầu: ${hint}`
      : `Gợi ý: ${hint}`;
  return { index, feedback };
}

interface LessonCommandOutcomeInput {
  actionFeedback?: string | null;
  applied: boolean;
  evaluation?: { completed: boolean; feedback: string } | null;
  intentKind: VoiceIntent["kind"];
  understoodAs: string;
}

export function resolveLessonCommandOutcome({
  actionFeedback,
  applied,
  evaluation,
  intentKind,
  understoodAs,
}: LessonCommandOutcomeInput) {
  if (intentKind === "unknown") {
    return {
      feedback: actionFeedback ?? "Mình chưa hiểu câu lệnh này. Bạn có thể nói lại hoặc dùng câu mẫu.",
      handled: false,
      outcome: "unsupported" as const,
    };
  }
  if (!applied) {
    return {
      feedback: actionFeedback ?? `Chưa thể ${understoodAs}. Hãy kiểm tra khối đang chọn hoặc thử lại.`,
      handled: false,
      outcome: "not_applied" as const,
    };
  }
  if (intentKind === "ask_hint" && actionFeedback) {
    return { feedback: actionFeedback, handled: true, outcome: "applied" as const };
  }
  const feedback = evaluation
    ? evaluation.completed
      ? evaluation.feedback
      : actionFeedback && actionFeedback !== evaluation.feedback
        ? `${actionFeedback} ${evaluation.feedback}`
        : evaluation.feedback
    : actionFeedback ?? `Đã thực hiện: ${understoodAs}.`;
  return {
    feedback,
    handled: true,
    outcome: "applied" as const,
  };
}
