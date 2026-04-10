import type {
  BlockKind,
  LessonStepEvaluationResult,
  ProgramExecutionResult,
  ProgramWorkspace,
} from "@shecancode/shared-types";

import { flattenBlocks, normalizeText } from "./helpers";

const FEEDBACK = {
  add_block_pass: "Bạn đã thêm đúng khối cần thiết.",
  add_block_fail: "Bạn vẫn chưa thêm khối được yêu cầu.",
  insert_into_pass: "Khối con đã nằm đúng bên trong khối cha.",
  insert_into_fail: "Hãy kéo khối con vào bên trong khối cha.",
  set_text_pass: "Nội dung văn bản đã đúng.",
  set_text_fail: "Nội dung văn bản chưa khớp với yêu cầu.",
  set_number_pass: "Giá trị số đã đúng.",
  set_number_fail: "Giá trị số chưa đúng với yêu cầu.",
  run_program_pass: "Chương trình đã chạy thành công.",
  run_program_fail: "Chương trình chưa chạy đúng như mong đợi.",
  ask_hint_pass: "Bạn đã mở gợi ý — tiếp tục nhé!",
} as const;

export type LessonStepAction =
  | { kind: "add_block"; blockType: BlockKind; label?: string }
  | { kind: "insert_into"; parentBlockType: BlockKind; childBlockType: BlockKind; slot?: string }
  | { kind: "set_text"; blockId: string; field: string; expectedText: string }
  | { kind: "set_number"; blockId: string; field: string; expectedNumber: number }
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
}

export function evaluateStepAction(
  action: LessonStepAction,
  workspace: ProgramWorkspace,
  executionResult: ProgramExecutionResult,
): LessonStepEvaluationResult {
  const blocks = flattenBlocks(workspace.blocks);

  switch (action.kind) {
    case "add_block":
      return blocks.some((block) => block.type === action.blockType)
        ? { completed: true, feedback: FEEDBACK.add_block_pass }
        : { completed: false, feedback: FEEDBACK.add_block_fail };
    case "insert_into":
      return blocks.some(
        (block) =>
          block.type === action.parentBlockType &&
          Array.isArray(block.children) &&
          block.children.length > 0 &&
          block.children.some((child) => child.type === action.childBlockType),
      )
        ? { completed: true, feedback: FEEDBACK.insert_into_pass }
        : { completed: false, feedback: FEEDBACK.insert_into_fail };
    case "set_text": {
      const fieldValue = blocks.find((block) => block.id === action.blockId)?.fields?.[action.field];
      return typeof fieldValue === "string" && fieldValue.trim() === action.expectedText.trim()
        ? { completed: true, feedback: FEEDBACK.set_text_pass }
        : { completed: false, feedback: FEEDBACK.set_text_fail };
    }
    case "set_number": {
      const fieldValue = blocks.find((block) => block.id === action.blockId)?.fields?.[action.field];
      const n = Number(fieldValue);
      return Number.isFinite(n) && n === action.expectedNumber
        ? { completed: true, feedback: FEEDBACK.set_number_pass }
        : { completed: false, feedback: FEEDBACK.set_number_fail };
    }
    case "run_program":
      if (executionResult.success !== true) {
        return { completed: false, feedback: FEEDBACK.run_program_fail };
      }
      if (action.expectedOutput === undefined) {
        return { completed: true, feedback: FEEDBACK.run_program_pass };
      }
      return executionResult.output.length === action.expectedOutput.length &&
        action.expectedOutput.every(
          (expected, index) => normalizeText(executionResult.output[index] ?? "") === normalizeText(expected),
        )
        ? { completed: true, feedback: FEEDBACK.run_program_pass }
        : { completed: false, feedback: FEEDBACK.run_program_fail };
    case "ask_hint":
      return { completed: true, feedback: FEEDBACK.ask_hint_pass };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
