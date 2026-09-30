import { normalizeVoiceText } from "../../voice-control/utils/global-voice-control";

export type CompletionModalAction = "next" | "list" | "restart";

/** Only the actions already present in the lesson completion dialog are allowed. */
export function matchCompletionModalAction(command: string, hasNextLesson: boolean): CompletionModalAction | null {
  const normalized = normalizeVoiceText(command);
  if (hasNextLesson && ["bai tiep theo", "mo bai tiep theo"].includes(normalized)) return "next";
  if (["danh sach bai", "ve danh sach bai", "mo danh sach bai"].includes(normalized)) return "list";
  if (["lam lai", "lam lai bai nay"].includes(normalized)) return "restart";
  return null;
}

export function runCompletionModalCommand(
  command: string,
  hasNextLesson: boolean,
  handlers: Record<CompletionModalAction, () => void>,
): CompletionModalAction | null {
  const action = matchCompletionModalAction(command, hasNextLesson);
  if (action) handlers[action]();
  return action;
}
