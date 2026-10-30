import { ACCESSIBILITY_POINTS, runRobotCommands, scoreRobotCommands, type RobotCommand, type RobotLevel } from "./canonical.ts";
import { requireString } from "./http.ts";

export const CONTENT_VERSION = "2026-10-29";
type RoundSnapshot = { config: Record<string, unknown>; content_version: string };
// Pure trusted scoring. The database compares this exact snapshot under locks.
export function verifySubmission(game: "accessibility" | "robot", input: Record<string, unknown>, round: RoundSnapshot) {
  if (round.content_version !== CONTENT_VERSION) throw new Error("round_content_mismatch");
  const item = requireString(input.itemId, "item_id", 40);
  if (game === "accessibility") {
    const answerId = requireString(input.answerId, "answer_id", 40);
    const options = Object.hasOwn(ACCESSIBILITY_POINTS, item) ? ACCESSIBILITY_POINTS[item] : undefined;
    const score = options && Object.hasOwn(options, answerId) ? options[answerId] : undefined;
    if (score === undefined) throw new Error("invalid_answer");
    return { payload: { answerId }, successful: true, score };
  }
  const commands = input.commands;
  if (!Array.isArray(commands) || commands.length > 24 || commands.some((x) => x !== "forward" && x !== "left" && x !== "right")) throw new Error("invalid_commands");
  const levels = round.config.levels as Record<string, RobotLevel> | undefined;
  const level = levels && Object.hasOwn(levels, item) ? levels[item] : undefined;
  if (!level) throw new Error("item_not_in_round");
  return { payload: { commands }, successful: runRobotCommands(level, commands as RobotCommand[]), score: scoreRobotCommands(level, commands as RobotCommand[]) };
}
