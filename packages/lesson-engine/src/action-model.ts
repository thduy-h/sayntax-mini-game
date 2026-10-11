import type {
  BlockKind,
  LessonStepEvaluationResult,
  ProgramExecutionResult,
  ProgramWorkspace,
} from "@shecancode/shared-types";

import { flattenBlocks, normalizeText } from "./helpers";

const FEEDBACK = {
  add_block_pass: "Bạn đã thêm đúng khối cần thiết.",
  insert_into_pass: "Khối con đã nằm đúng bên trong khối cha.",
  set_text_pass: "Nội dung văn bản đã đúng.",
  set_number_pass: "Giá trị số đã đúng.",
  run_program_pass: "Tốt lắm, chương trình đã chạy đúng.",
  run_program_fail: "Chương trình chưa chạy đúng như mong đợi. Hãy kiểm tra các khối rồi chạy lại.",
  ask_hint_pass: "Bạn đã mở gợi ý — tiếp tục nhé!",
} as const;

export type LessonStepAction =
  | { kind: "add_block"; blockType: BlockKind; label?: string; minimumCount?: number }
  | { kind: "insert_into"; parentBlockType: BlockKind; childBlockType: BlockKind; slot?: string }
  | { kind: "set_text"; blockId: string; field: string; expectedText: string }
  | { kind: "set_number"; blockId: string; field: string; expectedNumber: number }
  | { kind: "set_variable_output"; blockId: string; variableName: string }
  | { kind: "run_program"; expectedOutput?: string[] }
  | { kind: "ask_hint" };

export interface LessonStepV2 {
  id: string;
  databaseStepId: string;
  orderIndex: number;
  title: string;
  instructions: string;
  hints: string[];
  starterWorkspace: ProgramWorkspace;
  action: LessonStepAction;
  /**
   * Mark the final step of a lesson as a mini-challenge. The UI hides the
   * "câu mẫu" chip so the learner has to recall the phrase themselves, and
   * surfaces a small badge to signal the shift in tone. Optional — defaults
   * to false for regular learning steps.
   */
  isChallenge?: boolean;
}

function blockLabel(blockType: BlockKind) {
  return {
    if: "điều kiện",
    boolean_literal: "đúng/sai",
    number_literal: "số",
    print: "in",
    repeat: "lặp",
    start: "bắt đầu",
    text_literal: "chữ",
    variable: "biến",
    variable_get: "lấy biến",
  } satisfies Record<BlockKind, string>;
}

function labelFor(blockType: BlockKind) {
  return blockLabel(blockType)[blockType] ?? blockType;
}

function getTextCandidate(block: { fields?: Record<string, string | number | boolean>; inputs?: Record<string, { type: BlockKind; fields?: Record<string, string | number | boolean> }> }, field: string) {
  const literal = block.fields?.[field];
  const reporter = block.inputs?.[field];
  const reporterValue = reporter?.type === "text_literal" ? reporter.fields?.value : undefined;
  const candidate = reporterValue ?? literal;
  return candidate === undefined ? null : String(candidate);
}

function getNumberCandidate(block: { fields?: Record<string, string | number | boolean>; inputs?: Record<string, { type: BlockKind; fields?: Record<string, string | number | boolean> }> }, field: string) {
  const literal = block.fields?.[field];
  const reporter = block.inputs?.[field];
  const reporterValue = reporter?.type === "number_literal" ? reporter.fields?.value : undefined;
  const candidate = reporterValue ?? literal;
  if (candidate === undefined) return null;
  const value = Number(candidate);
  return Number.isFinite(value) ? value : null;
}

function hasVariableOutput(
  block: { type: BlockKind; inputs?: Record<string, { type: BlockKind; fields?: Record<string, string | number | boolean> }> },
  variableName: string,
) {
  const reporter = block.inputs?.text;
  return (
    block.type === "print" &&
    reporter?.type === "variable_get" &&
    typeof reporter.fields?.name === "string" &&
    normalizeText(reporter.fields.name) === normalizeText(variableName)
  );
}

function editTarget(blocks: ReturnType<typeof flattenBlocks>, blockId: string, field: string) {
  const seeded = blocks.find((block) => block.id === blockId);
  if (seeded) return seeded;
  const type: BlockKind | undefined = {
    name: "variable",
    text: "print",
    times: "repeat",
    value: "variable",
  }[field] as BlockKind | undefined;
  const candidates = type ? blocks.filter((block) => block.type === type) : blocks;
  return candidates[candidates.length - 1] ?? null;
}

export function evaluateStepAction(
  action: LessonStepAction,
  workspace: ProgramWorkspace,
  executionResult: ProgramExecutionResult,
): LessonStepEvaluationResult {
  const blocks = flattenBlocks(workspace.blocks);

  switch (action.kind) {
    case "add_block": {
      const requiredCount = action.minimumCount ?? 1;
      const currentCount = blocks.filter((block) => block.type === action.blockType).length;
      return currentCount >= requiredCount
        ? { completed: true, feedback: FEEDBACK.add_block_pass }
        : {
            completed: false,
            feedback:
              requiredCount > 1
                ? `Bạn cần ${requiredCount} khối ${labelFor(action.blockType)}. Hiện có ${currentCount}. Hãy thêm một khối ${labelFor(action.blockType)} nữa.`
                : `Bạn còn thiếu khối ${labelFor(action.blockType)}. Hãy nói hoặc nhập: thêm khối ${labelFor(action.blockType)}.`,
          };
    }
    case "insert_into": {
      const hasNested = blocks.some(
        (block) =>
          block.type === action.parentBlockType &&
          Array.isArray(block.children) &&
          block.children.length > 0 &&
          block.children.some((child) => child.type === action.childBlockType),
      );
      if (hasNested) return { completed: true, feedback: FEEDBACK.insert_into_pass };
      const hasParent = blocks.some((block) => block.type === action.parentBlockType);
      const hasChild = blocks.some((block) => block.type === action.childBlockType);
      if (!hasParent) {
        return { completed: false, feedback: `Bạn cần thêm một khối ${labelFor(action.parentBlockType)} trước.` };
      }
      if (!hasChild) {
        return { completed: false, feedback: `Bạn còn thiếu khối ${labelFor(action.childBlockType)} để đưa vào bên trong.` };
      }
      return {
        completed: false,
        feedback: `Bạn đã có khối ${labelFor(action.childBlockType)} và khối ${labelFor(action.parentBlockType)}. Bước tiếp theo là đưa khối ${labelFor(action.childBlockType)} vào bên trong khối ${labelFor(action.parentBlockType)}.`,
      };
    }
    case "set_text": {
      const target = editTarget(blocks, action.blockId, action.field);
      const targetText = target ? getTextCandidate(target, action.field) : null;
      const matchingText = targetText !== null && normalizeText(targetText) === normalizeText(action.expectedText);
      if (matchingText) {
        return { completed: true, feedback: FEEDBACK.set_text_pass };
      }
      const hasAnyTextField = targetText !== null && targetText.trim().length > 0;
      return hasAnyTextField
        ? {
            completed: false,
            feedback: `Bạn đã có nội dung rồi, nhưng chưa đúng. Hãy nói: đổi nội dung thành ${action.expectedText}.`,
          }
        : {
            completed: false,
            feedback: `Bạn còn thiếu nội dung chữ. Hãy nói: đặt chữ ${action.expectedText}.`,
          };
    }
    case "set_number": {
      const target = editTarget(blocks, action.blockId, action.field);
      const matchingNumber = target !== null && getNumberCandidate(target, action.field) === action.expectedNumber;
      return matchingNumber
        ? { completed: true, feedback: FEEDBACK.set_number_pass }
        : {
            completed: false,
            feedback: `Giá trị số chưa đúng. Hãy nói: đặt số ${action.expectedNumber}.`,
          };
    }
    case "set_variable_output": {
      const target = editTarget(blocks, action.blockId, "text");
      const hasCorrectVariableOutput = target !== null && hasVariableOutput(target, action.variableName);
      if (hasCorrectVariableOutput) {
        return { completed: true, feedback: "Khối in đã lấy đúng giá trị của biến." };
      }
      const text = target?.type === "print" ? getTextCandidate(target, "text") : null;
      const printsLiteralVariableName = text !== null && normalizeText(text) === normalizeText(action.variableName);
      return printsLiteralVariableName
        ? {
            completed: false,
            feedback: `Em đang in chữ '${action.variableName}', nhưng bài này muốn in giá trị của biến ${action.variableName}. Hãy nói: in biến ${action.variableName}.`,
          }
        : {
            completed: false,
            feedback: `Khối in chưa lấy giá trị biến ${action.variableName}. Hãy nói: in biến ${action.variableName}.`,
          };
    }
    case "run_program": {
      if (executionResult.success !== true) {
        return { completed: false, feedback: FEEDBACK.run_program_fail };
      }
      if (action.expectedOutput === undefined) {
        return { completed: true, feedback: FEEDBACK.run_program_pass };
      }
      // Loose comparison: normalize (lowercase + diacritic strip) AND strip
      // surrounding/trailing punctuation. Web Speech API often appends "."
      // or "!" to dictated text, which previously caused exact-match fails.
      const stripPunct = (s: string) => normalizeText(s).replace(/[.,!?;:"'()]+/g, "").trim();
      return executionResult.output.length === action.expectedOutput.length &&
        action.expectedOutput.every(
          (expected, index) => stripPunct(executionResult.output[index] ?? "") === stripPunct(expected),
        )
        ? { completed: true, feedback: FEEDBACK.run_program_pass }
        : {
            completed: false,
            feedback:
              action.expectedOutput.length === 1 && executionResult.output.length === 1
                ? `Chương trình đang in '${executionResult.output[0]}', nhưng cần in '${action.expectedOutput[0]}'. Hãy kiểm tra khối in và biến.`
                : FEEDBACK.run_program_fail,
          };
    }
    case "ask_hint":
      return { completed: true, feedback: FEEDBACK.ask_hint_pass };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
