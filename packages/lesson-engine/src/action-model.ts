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
  /**
   * Mark the final step of a lesson as a mini-challenge. The UI hides the
   * "câu mẫu" chip so the learner has to recall the phrase themselves, and
   * surfaces a small badge to signal the shift in tone. Optional — defaults
   * to false for regular learning steps.
   */
  isChallenge?: boolean;
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
      // Loose + ID-agnostic semantics: pass if ANY block in the workspace
      // has a non-empty value at fields[<field>] OR inputs[<field>] (a
      // Scratch-style reporter such as text_literal or variable_get).
      // The action.blockId is intentionally ignored here — the user-added
      // blocks have Blockly-generated ids that don't match seed ids, so we
      // match by field name instead. blockId stays in the type only as a
      // hint for the UI (set_text from voice still tries blockId first).
      const found = blocks.some((block) => {
        const literal = block.fields?.[action.field];
        const reporter = block.inputs?.[action.field];
        const reporterValue =
          reporter?.type === "text_literal" || reporter?.type === "variable_get"
            ? reporter.fields?.value ?? reporter.fields?.name
            : undefined;
        const candidate = reporterValue ?? literal;
        if (candidate === undefined) return false;
        const text = typeof candidate === "string" ? candidate : String(candidate);
        return text.trim().length > 0;
      });
      return found
        ? { completed: true, feedback: FEEDBACK.set_text_pass }
        : { completed: false, feedback: FEEDBACK.set_text_fail };
    }
    case "set_number": {
      // Loose + ID-agnostic: pass if ANY block has a finite number at
      // fields[<field>] OR inputs[<field>] (number_literal value).
      const found = blocks.some((block) => {
        const literal = block.fields?.[action.field];
        const reporter = block.inputs?.[action.field];
        const reporterValue = reporter?.type === "number_literal" ? reporter.fields?.value : undefined;
        const candidate = reporterValue ?? literal;
        if (candidate === undefined) return false;
        const n = Number(candidate);
        return Number.isFinite(n);
      });
      return found
        ? { completed: true, feedback: FEEDBACK.set_number_pass }
        : { completed: false, feedback: FEEDBACK.set_number_fail };
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
        : { completed: false, feedback: FEEDBACK.run_program_fail };
    }
    case "ask_hint":
      return { completed: true, feedback: FEEDBACK.ask_hint_pass };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
