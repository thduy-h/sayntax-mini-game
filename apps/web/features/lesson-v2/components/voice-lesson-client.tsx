"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import Link from "next/link";
import * as Blockly from "blockly";
import { executeProgram } from "@shecancode/block-engine";
import { listSeedV2Lessons, type LessonV2WithSteps } from "@shecancode/lesson-engine";
import { parseVoiceIntent, type VoiceIntent } from "@shecancode/voice-parser";
import type {
  BlockKind,
  ProgramExecutionResult,
  ProgramWorkspace,
  WorkspaceBlock,
} from "@shecancode/shared-types";
import { Mic, MicOff, Lightbulb, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/features/voice-control/hooks/use-speech-recognition";
import {
  evaluateStepAction,
  type LessonStepAction,
} from "../../../../../packages/lesson-engine/src/action-model";
import {
  describeIntent,
  deriveSampleUtterance,
  extractSampleFromInstructions,
  splitBoldSegments,
} from "../utils/intent-display";
import { markLessonV2StepCompletedAction } from "../server/actions";

interface VoiceLessonClientProps {
  lesson: LessonV2WithSteps;
  /** Step the learner should resume at (computed from persisted progress). */
  initialStepIndex?: number;
  /** True when the learner has already completed every step of this lesson. */
  initialAllCompleted?: boolean;
}

let registered = false;

const SUCCESS_EXECUTION: ProgramExecutionResult = { success: true, output: [], errors: [], variables: {} };
const typeMap: Partial<Record<BlockKind, string>> = {
  start: "scc_start",
  print: "scc_print",
  repeat: "scc_repeat",
  if: "scc_if",
  variable: "scc_variable",
  variable_get: "scc_variable_get",
  text_literal: "scc_text_literal",
  number_literal: "scc_number_literal",
};
const fieldMap = { text: "TEXT", name: "NAME", value: "VALUE", times: "TIMES", condition: "CONDITION" } as const;

const theme = Blockly.Theme.defineTheme("shecancode-voice", {
  name: "shecancode-voice",
  base: Blockly.Themes.Zelos,
  blockStyles: {
    logic_blocks: { colourPrimary: "#ff5f87", colourSecondary: "#ff87a4", colourTertiary: "#121212" },
    loop_blocks: { colourPrimary: "#ffb84d", colourSecondary: "#ffc86f", colourTertiary: "#121212" },
    text_blocks: { colourPrimary: "#7df2c3", colourSecondary: "#9af7d0", colourTertiary: "#121212" },
    variable_blocks: { colourPrimary: "#89b4ff", colourSecondary: "#a2c5ff", colourTertiary: "#121212" },
  },
  categoryStyles: {
    flow_category: { colour: "#ff5f87" },
    logic_category: { colour: "#ffb84d" },
    output_category: { colour: "#7df2c3" },
    variable_category: { colour: "#89b4ff" },
  },
  componentStyles: {
    workspaceBackgroundColour: "#fffdf3",
    toolboxBackgroundColour: "#fff6fb",
    toolboxForegroundColour: "#121212",
    flyoutBackgroundColour: "#ffffff",
    flyoutForegroundColour: "#121212",
    scrollbarColour: "#121212",
    insertionMarkerColour: "#121212",
    insertionMarkerOpacity: 0.3,
  },
});

const toolbox: Blockly.utils.toolbox.ToolboxDefinition = {
  contents: [
    { kind: "category", name: "Luồng", categorystyle: "flow_category", contents: [{ kind: "block", type: "scc_start" }] },
    { kind: "category", name: "Đầu ra", categorystyle: "output_category", contents: [{ kind: "block", type: "scc_print" }] },
    { kind: "category", name: "Lặp", categorystyle: "logic_category", contents: [{ kind: "block", type: "scc_repeat" }] },
    { kind: "category", name: "Điều kiện", categorystyle: "logic_category", contents: [{ kind: "block", type: "scc_if" }] },
    {
      kind: "category",
      name: "Giá trị",
      categorystyle: "output_category",
      contents: [
        { kind: "block", type: "scc_text_literal" },
        { kind: "block", type: "scc_number_literal" },
        { kind: "block", type: "scc_variable_get" },
      ],
    },
    { kind: "category", name: "Biến", categorystyle: "variable_category", contents: [{ kind: "block", type: "scc_variable" }] },
  ],
};

function ensureBlocks() {
  if (registered) return;
  Blockly.defineBlocksWithJsonArray([
    { type: "scc_start", message0: "bắt đầu", nextStatement: null, style: "logic_blocks" },
    { type: "scc_print", message0: "in %1", args0: [{ type: "input_value", name: "TEXT", check: ["String", "Number"] }], previousStatement: null, nextStatement: null, style: "text_blocks" },
    { type: "scc_repeat", message0: "lặp %1 lần", args0: [{ type: "field_number", name: "TIMES", value: 3, min: 0, precision: 1 }], message1: "thực hiện %1", args1: [{ type: "input_statement", name: "DO" }], previousStatement: null, nextStatement: null, style: "loop_blocks" },
    { type: "scc_if", message0: "nếu điều kiện là %1", args0: [{ type: "field_checkbox", name: "CONDITION", checked: true }], message1: "thì %1", args1: [{ type: "input_statement", name: "DO" }], previousStatement: null, nextStatement: null, style: "logic_blocks" },
    { type: "scc_variable", message0: "đặt biến %1 thành %2", args0: [{ type: "field_input", name: "NAME", text: "score" }, { type: "field_input", name: "VALUE", text: "5" }], previousStatement: null, nextStatement: null, style: "variable_blocks" },
    { type: "scc_text_literal", message0: "%1", args0: [{ type: "field_input", name: "VALUE", text: "Xin chào" }], output: "String", style: "text_blocks" },
    { type: "scc_number_literal", message0: "%1", args0: [{ type: "field_number", name: "VALUE", value: 0 }], output: "Number", style: "loop_blocks" },
    { type: "scc_variable_get", message0: "biến %1", args0: [{ type: "field_input", name: "NAME", text: "score" }], output: "String", style: "variable_blocks" },
  ]);
  registered = true;
}

function parseBlock(block: Blockly.Block): WorkspaceBlock {
  if (block.type === "scc_text_literal") {
    return { id: block.id, type: "text_literal", fields: { value: block.getFieldValue("VALUE") ?? "" } };
  }
  if (block.type === "scc_number_literal") {
    return { id: block.id, type: "number_literal", fields: { value: Number(block.getFieldValue("VALUE") ?? 0) } };
  }
  if (block.type === "scc_variable_get") {
    return { id: block.id, type: "variable_get", fields: { name: block.getFieldValue("NAME") ?? "" } };
  }
  if (block.type === "scc_start") return { id: block.id, type: "start" };
  if (block.type === "scc_print") {
    const valueBlock = block.getInputTargetBlock("TEXT");
    if (valueBlock) {
      return { id: block.id, type: "print", inputs: { text: parseBlock(valueBlock) } };
    }
    return { id: block.id, type: "print", fields: { text: "" } };
  }
  if (block.type === "scc_repeat") return { id: block.id, type: "repeat", fields: { times: Number(block.getFieldValue("TIMES") || 0) }, children: readChain(block.getInputTargetBlock("DO")) };
  if (block.type === "scc_if") return { id: block.id, type: "if", fields: { condition: block.getFieldValue("CONDITION") === "TRUE" }, children: readChain(block.getInputTargetBlock("DO")) };
  if (block.type === "scc_variable") return { id: block.id, type: "variable", fields: { name: block.getFieldValue("NAME") || "score", value: block.getFieldValue("VALUE") || "" } };
  return { id: block.id, type: "print", fields: { text: `Khối chưa hỗ trợ: ${block.type}` } };
}

function readChain(block: Blockly.Block | null): WorkspaceBlock[] {
  const items: WorkspaceBlock[] = [];
  let current = block;
  while (current) {
    items.push(parseBlock(current));
    current = current.getNextBlock();
  }
  return items;
}

function toProgram(workspace: Blockly.WorkspaceSvg): ProgramWorkspace {
  // Only execute blocks that are part of the chain starting from `start`.
  // Disconnected / floating blocks are treated as drafts and ignored, both
  // for execution and for evaluation. Beginner-friendly: matches the
  // Scratch-style "snap to start to actually run" mental model.
  const tops = workspace.getTopBlocks(true);
  const startBlock = tops.find((b) => b.type === "scc_start");
  if (!startBlock) return { version: 1, blocks: [] };
  return { version: 1, blocks: readChain(startBlock) };
}

function buildBlocklyChain(blocks: WorkspaceBlock[]): Record<string, unknown> | undefined {
  if (!blocks.length) return undefined;
  let tail: Record<string, unknown> | undefined;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const entry = domainBlockToBlockly(blocks[i]!);
    if (tail) entry.next = { block: tail };
    tail = entry;
  }
  return tail;
}

function domainBlockToBlockly(block: WorkspaceBlock, x?: number, y?: number): Record<string, unknown> {
  if (block.type === "text_literal") {
    return { id: block.id, type: "scc_text_literal", fields: { VALUE: String(block.fields?.value ?? "") } };
  }
  if (block.type === "number_literal") {
    return { id: block.id, type: "scc_number_literal", fields: { VALUE: Number(block.fields?.value ?? 0) } };
  }
  if (block.type === "variable_get") {
    return { id: block.id, type: "scc_variable_get", fields: { NAME: String(block.fields?.name ?? "") } };
  }
  if (block.type === "print") {
    const result: Record<string, unknown> = { id: block.id, type: "scc_print" };
    if (x !== undefined) result.x = x;
    if (y !== undefined) result.y = y;
    if (block.inputs?.text) {
      result.inputs = {
        TEXT: { block: domainBlockToBlockly(block.inputs.text) },
      };
    } else if (typeof block.fields?.text === "string") {
      result.inputs = {
        TEXT: {
          block: {
            type: "scc_text_literal",
            fields: { VALUE: String(block.fields.text) },
          },
        },
      };
    }
    return result;
  }
  const result: Record<string, unknown> = { id: block.id, type: typeMap[block.type] ?? block.type };
  if (x !== undefined) result.x = x;
  if (y !== undefined) result.y = y;
  const fields: Record<string, unknown> = {};
  if (block.type === "repeat" && block.fields?.times !== undefined) fields.TIMES = Number(block.fields.times);
  if (block.type === "if" && block.fields?.condition !== undefined) fields.CONDITION = block.fields.condition ? "TRUE" : "FALSE";
  if (block.type === "variable") {
    if (block.fields?.name !== undefined) fields.NAME = String(block.fields.name);
    if (block.fields?.value !== undefined) fields.VALUE = String(block.fields.value);
  }
  if (Object.keys(fields).length) result.fields = fields;
  if (block.children?.length) {
    const inputName = block.type === "repeat" || block.type === "if" ? "DO" : undefined;
    if (inputName) {
      const head = buildBlocklyChain(block.children);
      if (head) result.inputs = { [inputName]: { block: head } };
    }
  }
  return result;
}

function starterStateFromWorkspace(workspace: ProgramWorkspace) {
  if (!workspace.blocks.length) {
    return { blocks: { languageVersion: 0, blocks: [] } };
  }
  // Chain consecutive sibling blocks via `next` instead of emitting each as a
  // disconnected top-level block. Fixes a latent bug where backward nav into
  // steps like L3/L4 step 2 (starter = [start, repeat]) would load start and
  // repeat as two top-level blocks, forcing the learner to drag-connect them
  // by hand before the step could pass.
  const [first, ...rest] = workspace.blocks;
  const root = domainBlockToBlockly(first, 48, 40);
  let tail = root;
  for (const block of rest) {
    const entry = domainBlockToBlockly(block);
    (tail as { next?: { block: Record<string, unknown> } }).next = { block: entry };
    tail = entry;
  }
  return { blocks: { languageVersion: 0, blocks: [root] } };
}

function getInsertPosition(workspace: Blockly.WorkspaceSvg) {
  const roots = workspace.getTopBlocks(true);
  if (!roots.length) return { x: 48, y: 40 };
  const last = roots[roots.length - 1].getRelativeToSurfaceXY();
  return { x: last.x, y: last.y + 110 };
}

// Briefly highlight a block so the learner sees which one their command just
// affected. Uses Blockly's selection API (non-destructive, SELECTED events
// are filtered out of the step change listener upstream). Release after ~1.3s
// only if nothing else has stolen the selection in the meantime.
function flashBlock(block: Blockly.BlockSvg | null | undefined) {
  if (!block) return;
  try {
    block.select();
    window.setTimeout(() => {
      try {
        if (Blockly.common.getSelected() === block) {
          block.unselect();
        }
      } catch {
        /* block may have been disposed — ignore */
      }
    }, 1300);
  } catch {
    /* selection may fail mid-render — non-critical */
  }
}

function feedbackReason(reason: Extract<VoiceIntent, { kind: "unknown" }>["reason"]) {
  return { empty: "im lặng", no_match: "rõ hơn", ambiguous: "rõ hơn", partial_add_block: "thêm khối gì" }[reason];
}

function getActionFieldName(action: LessonStepAction) {
  if (action.kind !== "set_text" && action.kind !== "set_number") return undefined;
  return fieldMap[action.field as keyof typeof fieldMap] ?? action.field.toUpperCase();
}

export function VoiceLessonClient({
  lesson,
  initialStepIndex = 0,
  initialAllCompleted = false,
}: VoiceLessonClientProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const suppressEvaluationRef = useRef(false);
  const stepIndexRef = useRef(initialStepIndex);
  const advancingRef = useRef(false);
  const lastTranscriptRef = useRef("");
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [voiceLog, setVoiceLog] = useState<string[]>([]);
  const [showSkip, setShowSkip] = useState(false);
  const [runResult, setRunResult] = useState<ProgramExecutionResult | null>(null);
  const [lastIntent, setLastIntent] = useState<VoiceIntent | null>(null);
  const [lessonComplete, setLessonComplete] = useState(initialAllCompleted);
  const prevStepIndexRef = useRef(currentStepIndex);
  const speech = useSpeechRecognition();
  const currentStep = lesson.steps[currentStepIndex];
  const nextLesson = useMemo(() => {
    const all = listSeedV2Lessons();
    const idx = all.findIndex((entry) => entry.slug === lesson.slug);
    return idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
  }, [lesson.slug]);

  useEffect(() => {
    stepIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);

  useEffect(() => {
    // Client-side lesson changes (rare — App Router does full navigation)
    // reset to the resume point derived from persisted progress.
    setCurrentStepIndex(initialStepIndex);
    setLessonComplete(initialAllCompleted);
  }, [lesson.id, initialStepIndex, initialAllCompleted]);

  useEffect(() => {
    setFailCount(0);
    setLastFeedback(null);
    setShowSkip(false);
    setHintIndex(0);
    setRunResult(null);
    setLastIntent(null);
    // Hold the advancing guard briefly while Blockly's load events for the
    // new step's starterWorkspace flush; otherwise the change listener can
    // fire on the burst and re-evaluate against the previous step.
    advancingRef.current = true;
    const id = window.setTimeout(() => {
      advancingRef.current = false;
    }, 250);
    return () => window.clearTimeout(id);
  }, [currentStepIndex]);

  // Reset lessonComplete if the user navigates away from the last step
  // (e.g. via the sidebar or "Bước trước"). The completion card should only
  // appear when the learner is genuinely on the final completed step.
  useEffect(() => {
    if (currentStepIndex < lesson.steps.length - 1) setLessonComplete(false);
  }, [currentStepIndex, lesson.steps.length]);

  useEffect(() => {
    if (failCount >= 3) setShowSkip(true);
  }, [failCount]);

  function prevStep() {
    setCurrentStepIndex((index) => Math.max(0, index - 1));
  }

  function nextStep() {
    setCurrentStepIndex((index) => Math.min(lesson.steps.length - 1, index + 1));
  }

  function resetAfterSuccess(shouldAdvance: boolean) {
    setFailCount(0);
    setShowSkip(false);
    if (shouldAdvance) {
      // Set the guard immediately so any synchronous Blockly events queued
      // by applyIntentToWorkspace cannot trigger a second cascading advance
      // before React commits the state update.
      advancingRef.current = true;
      setLastFeedback(null);
      setCurrentStepIndex((index) => Math.min(lesson.steps.length - 1, index + 1));
    }
  }

  function markStepPassed() {
    // For the final step, mark the whole lesson complete so the celebration
    // overlay takes over. Intermediate steps just advance via resetAfterSuccess.
    if (currentStepIndex >= lesson.steps.length - 1) {
      setLessonComplete(true);
    }
  }

  function inferBlocklyTypeFromField(action: LessonStepAction): string | null {
    if (action.kind !== "set_text" && action.kind !== "set_number") return null;
    switch (action.field) {
      case "text":
        return "scc_print";
      case "name":
        return "scc_variable";
      case "value":
        return "scc_variable";
      case "times":
        return "scc_repeat";
      case "condition":
        return "scc_if";
      default:
        return null;
    }
  }

  function resolveTargetBlock(workspace: Blockly.WorkspaceSvg, action: LessonStepAction) {
    if (action.kind === "set_text" || action.kind === "set_number") {
      // 1. Try the seed's blockId first (works when starter loaded fresh).
      if (action.blockId) {
        const byId = workspace.getBlockById(action.blockId);
        if (byId) return byId;
      }
      // 2. Fallback: infer the Blockly type from the action's field name
      // and pick the most recent matching block. This handles the
      // persist-forward case where the user added blocks themselves —
      // their Blockly-generated ids don't match the seed's expected id.
      const inferred = inferBlocklyTypeFromField(action);
      if (inferred) {
        const all = workspace.getAllBlocks(false) as Blockly.BlockSvg[];
        for (let i = all.length - 1; i >= 0; i--) {
          const b = all[i];
          if (b && b.type === inferred) return b;
        }
      }
    }
    // 3. Final fallback: currently selected block (for free-form usage).
    const selected = Blockly.common.getSelected();
    return selected instanceof Blockly.Block ? selected : null;
  }

  function resolveFieldName(block: Blockly.Block, action: LessonStepAction, defaults: string[]) {
    const preferred = getActionFieldName(action);
    const candidates = preferred ? [preferred, action.kind === "set_text" || action.kind === "set_number" ? action.field : "", ...defaults] : defaults;
    return candidates.find((name) => name && Boolean(block.getField(name)));
  }

  function advanceHint() {
    if (!currentStep?.hints.length) return;
    setHintIndex((index) => (index + 1) % currentStep.hints.length);
  }

  // Fire-and-forget persistence when a step passes. The server action is
  // already resilient to auth/RLS/migration gaps, but we also catch here so
  // any unexpected rejection (network drop, DNS flake) never surfaces to
  // the learner as an unhandled promise rejection.
  function persistStepCompleted(stepId: string) {
    void markLessonV2StepCompletedAction(lesson.slug, stepId).catch(() => {
      /* swallow — persistence is best-effort */
    });
  }

  function evaluateAndMaybeAdvance(intent?: VoiceIntent) {
    if (advancingRef.current) return;
    const workspace = workspaceRef.current;
    if (!workspace || !currentStep) return;
    // Only run_program is allowed to evaluate without an explicit user intent.
    // Bare workspace events (CREATE/MOVE bursts during load) must NOT trigger
    // an unrelated step's evaluator — they previously caused 1->4 cascades.
    if (!intent && currentStep.action.kind !== "set_text" && currentStep.action.kind !== "set_number" && currentStep.action.kind !== "insert_into" && currentStep.action.kind !== "add_block") {
      return;
    }
    const program = toProgram(workspace);
    const exec = intent?.kind === "run_program" ? executeProgram(program) : SUCCESS_EXECUTION;
    if (intent?.kind === "run_program") setRunResult(exec);
    const evaluation = evaluateStepAction(currentStep.action, program, exec);
    setLastFeedback(evaluation.feedback);
    if (evaluation.completed) {
      persistStepCompleted(currentStep.id);
      markStepPassed();
      resetAfterSuccess(currentStepIndex < lesson.steps.length - 1);
      return;
    }
    setFailCount((count) => count + 1);
  }

  function runProgramFromButton() {
    const workspace = workspaceRef.current;
    if (!workspace || !currentStep) return;
    const program = toProgram(workspace);
    const exec = executeProgram(program);
    setRunResult(exec);
    const evaluation = evaluateStepAction(currentStep.action, program, exec);
    setLastFeedback(evaluation.feedback);
    if (evaluation.completed) {
      persistStepCompleted(currentStep.id);
      markStepPassed();
      resetAfterSuccess(currentStepIndex < lesson.steps.length - 1);
    } else {
      setFailCount((count) => count + 1);
    }
  }

  function setFieldFromIntent(intent: Extract<VoiceIntent, { kind: "set_text" | "set_number" }>) {
    const workspace = workspaceRef.current;
    if (!workspace || !currentStep) return false;
    const target = resolveTargetBlock(workspace, currentStep.action);
    if (!target) {
      setLastFeedback(intent.kind === "set_text" ? "Hãy chọn khối trước khi đặt chữ." : "Hãy chọn khối trước khi đặt số.");
      return false;
    }
    const value = intent.kind === "set_text" ? intent.text : String(intent.value);
    // Special-case scc_print: TEXT is a value_input slot, not a field. We
    // write the new value into the connected text_literal reporter (creating
    // one if the slot is empty).
    if (target.type === "scc_print" && intent.kind === "set_text") {
      let textLiteral = target.getInputTargetBlock("TEXT") as Blockly.BlockSvg | null;
      if (!textLiteral || textLiteral.type !== "scc_text_literal") {
        const created = workspace.newBlock("scc_text_literal") as Blockly.BlockSvg;
        created.initSvg();
        created.render();
        const slot = (target as Blockly.BlockSvg).getInput("TEXT");
        if (slot?.connection && created.outputConnection) {
          // Disconnect any existing reporter (e.g. variable_get) before
          // attaching the fresh literal so the user's voice command is
          // respected even if the seed had something else there.
          const existing = slot.connection.targetBlock();
          if (existing) {
            slot.connection.disconnect();
            existing.dispose(true);
          }
          slot.connection.connect(created.outputConnection);
        }
        textLiteral = created;
      }
      textLiteral.setFieldValue(value, "VALUE");
      flashBlock(target as Blockly.BlockSvg);
      return true;
    }
    const fieldName = resolveFieldName(target, currentStep.action, intent.kind === "set_text" ? ["TEXT", "NAME"] : ["TIMES", "VALUE"]);
    if (!fieldName) {
      setLastFeedback("Không tìm thấy ô dữ liệu phù hợp trong khối đang chọn.");
      return false;
    }
    target.setFieldValue(value, fieldName);
    flashBlock(target as Blockly.BlockSvg);
    return true;
  }

  function applyIntentToWorkspace(intent: VoiceIntent) {
    const workspace = workspaceRef.current;
    if (!workspace || !currentStep) return { changed: false, shouldEvaluate: false };
    switch (intent.kind) {
      case "add_block": {
        const blocklyType = typeMap[intent.blockType];
        if (!blocklyType) return { changed: false, shouldEvaluate: false };
        const block = workspace.newBlock(blocklyType) as Blockly.BlockSvg;
        block.initSvg();
        block.render();
        // Explicit "vào trong Y" — the learner asked for an inside placement.
        // Find the matching parent container, walk to the tail of its DO
        // chain, and attach there. Falls through to after-current if the
        // parent can't be located (e.g. the repeat/if block doesn't exist
        // yet — the UI then treats it as a plain add-after).
        if (
          intent.blockType !== "start" &&
          intent.position?.kind === "inside" &&
          block.previousConnection
        ) {
          const parentBlocklyType = typeMap[intent.position.parentHint];
          if (parentBlocklyType) {
            const all = workspace.getAllBlocks(false) as Blockly.BlockSvg[];
            const parent = all.find((b) => b.type === parentBlocklyType);
            const slot = parent?.getInput("DO");
            if (parent && slot?.connection) {
              const firstChild = slot.connection.targetBlock() as Blockly.BlockSvg | null;
              if (!firstChild) {
                slot.connection.connect(block.previousConnection);
                flashBlock(block);
                return { changed: true, shouldEvaluate: true };
              }
              let tail: Blockly.BlockSvg = firstChild;
              let next = tail.getNextBlock() as Blockly.BlockSvg | null;
              while (next) {
                tail = next;
                next = tail.getNextBlock() as Blockly.BlockSvg | null;
              }
              if (tail.nextConnection) {
                block.previousConnection.connect(tail.nextConnection);
                flashBlock(block);
                return { changed: true, shouldEvaluate: true };
              }
            }
          }
          // Fall through to the default after-current path if we couldn't
          // attach inside (container missing / slot locked / no connection).
        }
        // Default: auto-connect non-start blocks to the bottom of the start
        // chain so they actually execute. Beginner-friendly: voice-added
        // blocks shouldn't float disconnected.
        if (intent.blockType !== "start" && block.previousConnection) {
          const tops = workspace.getTopBlocks(true) as Blockly.BlockSvg[];
          const start = tops.find((b) => b.type === "scc_start") as Blockly.BlockSvg | undefined;
          if (start) {
            let last: Blockly.BlockSvg = start;
            let nextBlock = last.getNextBlock() as Blockly.BlockSvg | null;
            while (nextBlock) {
              last = nextBlock;
              nextBlock = last.getNextBlock() as Blockly.BlockSvg | null;
            }
            if (last.nextConnection) {
              block.previousConnection.connect(last.nextConnection);
              flashBlock(block);
              return { changed: true, shouldEvaluate: true };
            }
          }
        }
        const { x, y } = getInsertPosition(workspace);
        block.moveBy(x, y);
        flashBlock(block);
        return { changed: true, shouldEvaluate: true };
      }
      case "insert_into": {
        const parentType = intent.parentHint ?? (currentStep.action.kind === "insert_into" ? currentStep.action.parentBlockType : undefined);
        const childType = currentStep.action.kind === "insert_into" ? currentStep.action.childBlockType : "print";
        const roots = workspace.getTopBlocks(true) as Blockly.BlockSvg[];
        const parent = parentType ? roots.find((block) => block.type === typeMap[parentType]) : undefined;
        const child = [...roots].reverse().find((block) => block !== parent && block.type === typeMap[childType]);
        const input = parent?.getInput("DO");
        if (!parent || !input?.connection || input.connection.targetBlock()) {
          setLastFeedback("Đang thêm vào trong khối — hãy dùng chuột để kéo thả nếu cần.");
          return { changed: false, shouldEvaluate: true };
        }
        if (!child?.previousConnection) {
          setLastFeedback("Hãy thêm khối con trước");
          return { changed: false, shouldEvaluate: false };
        }
        input.connection.connect(child.previousConnection);
        return { changed: true, shouldEvaluate: true };
      }
      case "set_text":
      case "set_number":
        return { changed: setFieldFromIntent(intent), shouldEvaluate: true };
      case "delete_last": {
        // Prefer the currently-selected block (the learner's explicit target),
        // but never the hat — scc_start is the program entry point and
        // removing it would strand the rest of the chain. Fall back to the
        // tail of the start-chain if nothing relevant is selected.
        const selected = Blockly.common.getSelected();
        let victim: Blockly.BlockSvg | null = null;
        if (selected instanceof Blockly.BlockSvg && selected.type !== "scc_start") {
          victim = selected;
        } else {
          const tops = workspace.getTopBlocks(true) as Blockly.BlockSvg[];
          const start = tops.find((b) => b.type === "scc_start") as Blockly.BlockSvg | undefined;
          if (start) {
            let tail: Blockly.BlockSvg = start;
            let next = tail.getNextBlock() as Blockly.BlockSvg | null;
            while (next) {
              tail = next;
              next = tail.getNextBlock() as Blockly.BlockSvg | null;
            }
            if (tail !== start) victim = tail;
          }
        }
        if (!victim) {
          setLastFeedback("Không có khối nào để xoá.");
          return { changed: false, shouldEvaluate: false };
        }
        victim.dispose(true);
        setLastFeedback("Đã xoá khối cuối.");
        // Don't re-evaluate: deletion usually regresses the step state and
        // firing a fail just because the learner corrected themselves would
        // spam the feedback panel. The next intent will trigger eval.
        return { changed: true, shouldEvaluate: false };
      }
      case "run_program":
        return { changed: false, shouldEvaluate: true };
      case "ask_hint":
        advanceHint();
        return { changed: false, shouldEvaluate: currentStep.action.kind === "ask_hint" };
      case "unknown":
        setLastFeedback(`Chưa hiểu câu lệnh. Thử nói lại hoặc nhấn ${feedbackReason(intent.reason)}.`);
        return { changed: false, shouldEvaluate: false };
      default:
        return { changed: false, shouldEvaluate: false };
    }
  }

  // Inject Blockly ONCE on mount. Don't dispose on step change — only clear
  // and reload the starter via the next effect. Disposing per step caused
  // bursts of CREATE/MOVE events to fire on a stale closure listener.
  useEffect(() => {
    ensureBlocks();
    if (!containerRef.current || workspaceRef.current) return;
    const workspace = Blockly.inject(containerRef.current, {
      toolbox,
      theme,
      trashcan: true,
      grid: { colour: "#d1d5db", length: 28, snap: true, spacing: 28 },
      move: { drag: true, scrollbars: true, wheel: true },
      zoom: { controls: true, maxScale: 1.4, minScale: 0.7, startScale: 0.92, wheel: true },
    });
    workspaceRef.current = workspace;
    setWorkspaceReady(true);
    return () => {
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, []);

  // Load the current step's starter ONLY when:
  //  - It's the first time we're rendering a step (mount)
  //  - The user navigated BACKWARD or jumped non-adjacently via the sidebar
  // For natural forward advance (auto-advance after success, or "Bước sau"
  // button), KEEP the existing workspace as-is — the learner's blocks
  // persist across steps the way Scratch's single workspace does.
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspaceReady || !workspace || !currentStep) return;
    const prevIndex = prevStepIndexRef.current;
    const isInitialLoad = workspace.getAllBlocks(false).length === 0;
    const isAdjacentForward = currentStepIndex === prevIndex + 1;
    prevStepIndexRef.current = currentStepIndex;
    // Adjacent forward advance: don't touch the workspace.
    if (!isInitialLoad && isAdjacentForward) {
      return;
    }
    // Backward, jump, or first load: reset to this step's starter.
    suppressEvaluationRef.current = true;
    workspace.clear();
    Blockly.serialization.workspaces.load(starterStateFromWorkspace(currentStep.starterWorkspace), workspace);
    const id = window.setTimeout(() => {
      suppressEvaluationRef.current = false;
    }, 50);
    return () => window.clearTimeout(id);
  }, [currentStep, currentStepIndex, workspaceReady]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace || !currentStep) return;
    const attachedIndex = currentStepIndex;
    const onChange = (event: Blockly.Events.Abstract) => {
      if (suppressEvaluationRef.current) return;
      if (advancingRef.current) return;
      // Bail if the listener's captured step is no longer current.
      if (stepIndexRef.current !== attachedIndex) return;
      if (
        event.type === Blockly.Events.CLICK ||
        event.type === Blockly.Events.SELECTED ||
        event.type === Blockly.Events.VIEWPORT_CHANGE ||
        event.type === Blockly.Events.UI ||
        event.type === Blockly.Events.BUBBLE_OPEN ||
        event.type === Blockly.Events.THEME_CHANGE ||
        event.type === Blockly.Events.TOOLBOX_ITEM_SELECT ||
        event.type === Blockly.Events.FINISHED_LOADING
      ) return;
      if (currentStep.action.kind === "run_program" || currentStep.action.kind === "ask_hint") return;
      evaluateAndMaybeAdvance();
    };
    workspace.addChangeListener(onChange);
    return () => workspace.removeChangeListener(onChange);
  }, [currentStep, currentStepIndex]);

  useEffect(() => {
    const transcript = speech.transcript.trim();
    if (!transcript) return;
    if (transcript === lastTranscriptRef.current) return;
    lastTranscriptRef.current = transcript;
    if (advancingRef.current) return;
    setVoiceLog((items) => [...items, transcript].slice(-5));
    const intent = parseVoiceIntent(transcript);
    setLastIntent(intent);
    suppressEvaluationRef.current = true;
    const outcome = applyIntentToWorkspace(intent);
    // Hold suppression briefly so any sync Blockly events from newBlock()
    // / connect() don't slip past before we run the user-driven evaluation.
    window.setTimeout(() => {
      suppressEvaluationRef.current = false;
    }, 50);
    if (outcome.shouldEvaluate) evaluateAndMaybeAdvance(intent);
  }, [speech.transcript]);

  if (!currentStep) {
    return (
      <section className="rounded-[1.4rem] border-4 border-black bg-[#fffdf3] p-6 shadow-[8px_8px_0_#121212]">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-black">Bài học chưa sẵn sàng</p>
        <p className="mt-3 text-base text-black">Không tìm thấy bước hiện tại để hiển thị workspace.</p>
      </section>
    );
  }

  const activeHint = currentStep.hints[hintIndex % Math.max(currentStep.hints.length, 1)];
  const isChallenge = currentStep.isChallenge === true;
  // Challenge steps hide the sample chip — the learner has to recall the
  // phrase themselves. Hints still available via the sidebar button.
  const sampleUtterance = isChallenge
    ? null
    : extractSampleFromInstructions(currentStep.instructions) ??
      deriveSampleUtterance(currentStep.action);

  return (
    <section className="relative grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]">
      {lessonComplete && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[1.4rem] bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.4rem] border-4 border-black bg-[#fff6fb] p-6 shadow-[10px_10px_0_#121212]">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-black">Hoàn thành 🎉</p>
            <h2 className="font-heading mt-2 text-3xl text-black">Xong bài "{lesson.title}"!</h2>
            <p className="mt-3 text-sm text-zinc-800">
              Bạn đã làm xong toàn bộ {lesson.steps.length} bước. Tiếp tục để học khái niệm tiếp theo, hoặc làm lại bài này nếu muốn ôn.
            </p>
            {runResult?.success && runResult.output.length > 0 && (
              <div className="mt-3 rounded border-2 border-black bg-white px-3 py-2 font-mono text-xs">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black">Kết quả cuối</p>
                <ul className="mt-1 list-none">
                  {runResult.output.map((line, i) => (
                    <li key={i} className="text-black">{line}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {nextLesson ? (
                <Link
                  href={`/lessons-v2/${nextLesson.slug}`}
                  className="inline-flex min-h-10 items-center rounded-[0.75rem] border-4 border-black bg-[#a8e6ff] px-4 py-2 text-sm font-black uppercase text-black shadow-[4px_4px_0_#121212] transition hover:-translate-y-0.5"
                >
                  Bài tiếp theo: {nextLesson.title} →
                </Link>
              ) : (
                <Link
                  href="/lessons-v2"
                  className="inline-flex min-h-10 items-center rounded-[0.75rem] border-4 border-black bg-[#a8e6ff] px-4 py-2 text-sm font-black uppercase text-black shadow-[4px_4px_0_#121212] transition hover:-translate-y-0.5"
                >
                  Đã xong toàn bộ — Về danh sách
                </Link>
              )}
              <Link
                href="/lessons-v2"
                className="inline-flex min-h-10 items-center rounded-[0.75rem] border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase text-black shadow-[4px_4px_0_#121212] transition hover:-translate-y-0.5"
              >
                Danh sách bài
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setLessonComplete(false);
                  setCurrentStepIndex(0);
                  setRunResult(null);
                  setLastFeedback(null);
                }}
              >
                Làm lại
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="flex min-h-0 flex-col rounded-[1.4rem] border-4 border-black bg-white shadow-[8px_8px_0_#121212]">
        <div className="border-b-4 border-black px-4 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black">
            Bước {currentStepIndex + 1} / {lesson.steps.length}
            {isChallenge && (
              <span className="ml-2 inline-flex items-center rounded border-2 border-black bg-[#ffb84d] px-1.5 py-0 text-[9px] font-black uppercase text-black">
                Thử thách
              </span>
            )}
          </p>
          <p className="mt-0.5 text-base font-bold text-black">{currentStep.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-700">
            {splitBoldSegments(currentStep.instructions).map((seg, i) =>
              seg.bold ? (
                <strong key={i} className="font-black text-black">
                  {seg.text}
                </strong>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
          </p>
          {sampleUtterance && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600">
                Câu mẫu
              </span>
              <span className="rounded border-2 border-black bg-[#fff6fb] px-2 py-0.5 font-mono text-[11px] font-semibold text-black">
                “{sampleUtterance}”
              </span>
            </div>
          )}
        </div>
        <div ref={containerRef} className="min-h-[320px] w-full flex-1 border-b-4 border-black" />
        <div className="flex flex-wrap items-center gap-2 border-b-4 border-black px-3 py-2">
          <Button
            size="sm"
            onClick={() => (speech.isListening ? speech.stopListening() : speech.startListening())}
            disabled={!speech.isSupported}
          >
            {speech.isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
            {speech.isListening ? "Dừng" : "Nói"}
          </Button>
          <Button size="sm" variant="outline" onClick={runProgramFromButton}>
            <Play className="mr-2 h-4 w-4" />
            Chạy
          </Button>
          <Button size="sm" variant="outline" onClick={prevStep} disabled={currentStepIndex === 0}>
            ← Trước
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={nextStep}
            disabled={currentStepIndex >= lesson.steps.length - 1}
          >
            Sau →
          </Button>
          {showSkip && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                nextStep();
                setFailCount(0);
                setShowSkip(false);
              }}
            >
              Bỏ qua
            </Button>
          )}
          {speech.transcript && (
            <span className="ml-auto truncate font-mono text-xs text-zinc-700">"{speech.transcript}"</span>
          )}
        </div>
        <div className="flex min-h-[60px] flex-col gap-1 px-3 py-1.5 text-xs">
          {!speech.isSupported && (
            <p className="text-red-600">Trình duyệt chưa hỗ trợ nhận giọng nói — dùng chuột để kéo khối.</p>
          )}
          {speech.errorMessage && <p className="text-red-600">{speech.errorMessage}</p>}
          {lastIntent && (
            <p className="text-zinc-600">
              <span className="font-black uppercase tracking-[0.14em] text-[9px] text-zinc-500">
                Mình hiểu là
              </span>{" "}
              <span className="font-semibold text-black">{describeIntent(lastIntent)}</span>
            </p>
          )}
          {lastFeedback && <p className="font-semibold text-black">{lastFeedback}</p>}
          {runResult && (
            <div className="rounded border-2 border-black bg-[#fffdf3] px-2 py-1 font-mono">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black">Kết quả</p>
              {runResult.success ? (
                runResult.output.length === 0 ? (
                  <p className="text-zinc-500">(không có đầu ra)</p>
                ) : (
                  <ul className="list-none">
                    {runResult.output.map((line, i) => (
                      <li key={i} className="text-black">
                        {line}
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <ul className="list-none text-red-600">
                  {runResult.errors.length > 0 ? (
                    runResult.errors.map((err, i) => <li key={i}>{err}</li>)
                  ) : (
                    <li>Chương trình lỗi không xác định.</li>
                  )}
                </ul>
              )}
            </div>
          )}
          {!lastFeedback && !runResult && !speech.errorMessage && voiceLog.length > 0 && (
            <p className="text-zinc-500">Đã nói: {voiceLog.slice(-3).join(" · ")}</p>
          )}
        </div>
      </div>
      <aside className="flex min-h-0 flex-col gap-3 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col rounded-[1.4rem] border-4 border-black bg-[#fffdf3] shadow-[8px_8px_0_#121212]">
          <div className="border-b-4 border-black px-4 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black">Các bước</p>
          </div>
          <ol className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-2 text-sm">
            {lesson.steps.map((step, i) => (
              <li key={step.id}>
                <button
                  onClick={() => setCurrentStepIndex(i)}
                  className={`w-full rounded border-2 border-black px-2 py-1 text-left text-xs transition ${
                    i === currentStepIndex ? "bg-[#a8e6ff] font-black" : "bg-white hover:bg-[#fff6fb]"
                  }`}
                >
                  {i + 1}. {step.title}
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-2 rounded-[1.4rem] border-4 border-black bg-[#fff6fb] px-3 py-2 shadow-[8px_8px_0_#121212]">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
              <Lightbulb className="h-3.5 w-3.5" />
              Gợi ý
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={advanceHint}
              disabled={currentStep.hints.length === 0}
            >
              Đổi
            </Button>
          </div>
          <p className="text-xs text-zinc-800">{activeHint ?? "Chưa có gợi ý cho bước này."}</p>
        </div>
      </aside>
    </section>
  );
}
