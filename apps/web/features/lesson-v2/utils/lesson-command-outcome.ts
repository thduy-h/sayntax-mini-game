import type { VoiceIntent } from "@shecancode/voice-parser";

export type LessonCommandOutcome = "applied" | "not_applied" | "unsupported" | "pending";

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
      feedback: actionFeedback ?? "Mình chưa hiểu câu lệnh này. Em có thể nói lại hoặc dùng câu mẫu.",
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
