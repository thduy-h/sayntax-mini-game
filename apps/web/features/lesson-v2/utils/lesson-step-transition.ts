import type { LessonStepEvaluationResult, ProgramExecutionResult } from "@shecancode/shared-types";
import { conciseAnnouncement, programResultAnnouncement } from "../../voice-control/utils/accessible-announcements";

export interface CompletedStepResult {
  feedback: string;
  fromStepIndex: number;
  runResult: ProgramExecutionResult | null;
  stepTitle: string;
  toStepIndex: number;
}

export function completedStepResult(
  evaluation: LessonStepEvaluationResult,
  fromStepIndex: number,
  stepCount: number,
  stepTitle: string,
  runResult: ProgramExecutionResult | null,
): CompletedStepResult | null {
  if (!evaluation.completed || fromStepIndex >= stepCount - 1) return null;
  return {
    feedback: evaluation.feedback,
    fromStepIndex,
    runResult,
    stepTitle,
    toStepIndex: fromStepIndex + 1,
  };
}

export function completedStepWithFeedback(result: CompletedStepResult | null, fromStepIndex: number, feedback: string) {
  return result?.fromStepIndex === fromStepIndex ? { ...result, feedback } : result;
}

export function completedStepAnnouncement(result: CompletedStepResult, nextStepTitle: string): string {
  const output = result.runResult ? ` ${programResultAnnouncement(result.runResult, null)}` : "";
  return conciseAnnouncement(
    `Bước ${result.fromStepIndex + 1} đã hoàn thành. ${result.feedback} Đang ở bước ${result.toStepIndex + 1}: ${nextStepTitle}.${output}`,
  );
}
