"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Blockly from "blockly";
import { executeProgram } from "@shecancode/block-engine";
import { listSeedV2Lessons, type LessonV2WithSteps } from "@shecancode/lesson-engine";
import { SPEECH_RANKING_THRESHOLDS, type SpeechAlternativeInput, type ToolboxCategoryId, type VoiceIntent } from "@shecancode/voice-parser";
import type {
  AccessibilitySettings,
  BlockKind,
  LessonStepEvaluationResult,
  ProgramExecutionResult,
  ProgramWorkspace,
  WorkspaceBlock,
} from "@shecancode/shared-types";
import { Mic, MicOff, Lightbulb, Play, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobalCommand } from "@/features/voice-control/components/global-command-context";
import { useSpeechRecognition } from "@/features/voice-control/hooks/use-speech-recognition";
import {
  acknowledgeVoiceProcessing,
  canStartVoiceRecognition,
  hasAcknowledgedVoiceProcessing,
  shouldPersistVoiceCommandLog,
  VOICE_PROCESSING_DISCLOSURE,
} from "@/features/voice-control/utils/voice-privacy";
import {
  commandFeedbackAnnouncement,
  conciseAnnouncement,
  distinctAnnouncement,
  programResultAnnouncement,
  speechStatusAnnouncement,
  type SpeechAnnouncementState,
} from "@/features/voice-control/utils/accessible-announcements";
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
import type { InsertCursor, InsertCursorPosition, VoiceCursorDisplayItem } from "../utils/voice-cursor";
import {
  markDemoStepCompleted,
  readDemoProgressFromStorage,
  resetDemoProgressInStorage,
  shouldUseServerPersistence,
  writeDemoProgressToStorage,
} from "../utils/demo-progress";
import {
  createVoiceCommandRankingContext,
  parseVoiceCommandInput,
  rankVoiceCommandAlternatives,
  type VoiceCommandSource,
} from "../utils/voice-command-input";
import { runCompletionModalCommand } from "../utils/completion-modal-command";
import { nextLessonHint, resolveLessonCommandOutcome, unknownCommandRecovery } from "../utils/lesson-command-outcome";
import { resolveAuthoritativeEditTarget } from "../utils/lesson-edit-target";
import { completedStepAnnouncement, completedStepResult, completedStepWithFeedback, type CompletedStepResult } from "../utils/lesson-step-transition";
import { lessonVoicePresentation } from "../utils/lesson-voice-presentation";
import { planStepNavigation, willReplaceWorkspace, workspaceContentSignature } from "../utils/step-navigation";
import {
  calculateWorkspacePanTarget,
  clampWorkspaceScale,
  createsProgramUndoSnapshot,
  requiresVoiceConfirmation,
} from "../utils/workspace-viewport";
import { markLessonV2StepCompletedAction } from "../server/actions";
import type { GlobalCommandExecutionResult } from "@/features/voice-control/utils/global-command-routing";

interface VoiceLessonClientProps {
  lesson: LessonV2WithSteps;
  /** Step the learner should resume at (computed from persisted progress). */
  initialStepIndex?: number;
  /** True when the learner has already completed every step of this lesson. */
  initialAllCompleted?: boolean;
  accessibilitySettings?: Pick<
    AccessibilitySettings,
    "audioInstructions" | "fontScale" | "highContrast" | "keyboardNavigationHints" | "largeTouchTargets" | "reducedMotion"
  > | null;
  mode?: "authenticated" | "demo";
}

type PendingVoiceAction =
  | { kind: "workspace"; intent: VoiceIntent; preview: string }
  | { kind: "step_navigation"; fromStepIndex: number; targetIndex: number; preview: string };

type StepNavigationNotice = { targetIndex: number; feedback: string };

type LessonIntentApplication = {
  applied?: boolean;
  changed: boolean;
  evaluation?: LessonStepEvaluationResult | null;
  shouldEvaluate: boolean;
};

type UndoSnapshot = {
  label: string;
  state: Record<string, unknown>;
};

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
  boolean_literal: "scc_boolean_literal",
};
const fieldMap = { text: "TEXT", name: "NAME", value: "VALUE", times: "TIMES", condition: "CONDITION" } as const;
const TOOLBOX_CATEGORY_LABEL: Record<ToolboxCategoryId, string> = {
  condition: "Điều kiện",
  flow: "Luồng",
  loop: "Lặp",
  output: "Đầu ra",
  value: "Giá trị",
  variable: "Biến",
};

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
    { kind: "category", id: "flow", name: "Luồng", categorystyle: "flow_category", contents: [{ kind: "block", type: "scc_start" }] },
    {
      kind: "category",
      id: "output",
      name: "Đầu ra",
      categorystyle: "output_category",
      contents: [
        {
          kind: "block",
          type: "scc_print",
          inputs: { TEXT: { block: { type: "scc_text_literal", fields: { VALUE: "Xin chào" } } } },
        },
        {
          kind: "block",
          type: "scc_print",
          inputs: { TEXT: { block: { type: "scc_variable_get", fields: { NAME: "diem" } } } },
        },
      ],
    },
    { kind: "category", id: "loop", name: "Lặp", categorystyle: "logic_category", contents: [{ kind: "block", type: "scc_repeat" }] },
    { kind: "category", id: "condition", name: "Điều kiện", categorystyle: "logic_category", contents: [{ kind: "block", type: "scc_if" }] },
    {
      kind: "category",
      id: "value",
      name: "Giá trị",
      categorystyle: "output_category",
      contents: [
        { kind: "block", type: "scc_text_literal" },
        { kind: "block", type: "scc_number_literal" },
        { kind: "block", type: "scc_boolean_literal" },
      ],
    },
    {
      kind: "category",
      id: "variable",
      name: "Biến",
      categorystyle: "variable_category",
      contents: [{ kind: "block", type: "scc_variable" }, { kind: "block", type: "scc_variable_get" }],
    },
  ],
};

function ensureBlocks() {
  if (registered) return;
  Blockly.defineBlocksWithJsonArray([
    { type: "scc_start", message0: "bắt đầu", nextStatement: null, style: "logic_blocks" },
    { type: "scc_print", message0: "in %1", args0: [{ type: "input_value", name: "TEXT", check: ["String", "Number", "Boolean"] }], previousStatement: null, nextStatement: null, style: "text_blocks" },
    { type: "scc_repeat", message0: "lặp %1 lần", args0: [{ type: "field_number", name: "TIMES", value: 3, min: 0, precision: 1 }], message1: "thực hiện %1", args1: [{ type: "input_statement", name: "DO" }], previousStatement: null, nextStatement: null, style: "loop_blocks" },
    { type: "scc_if", message0: "nếu %1", args0: [{ type: "input_value", name: "CONDITION", check: "Boolean" }], message1: "thì %1", args1: [{ type: "input_statement", name: "DO" }], previousStatement: null, nextStatement: null, style: "logic_blocks" },
    { type: "scc_variable", message0: "đặt biến %1 thành %2", args0: [{ type: "field_input", name: "NAME", text: "score" }, { type: "field_input", name: "VALUE", text: "5" }], previousStatement: null, nextStatement: null, style: "variable_blocks" },
    { type: "scc_text_literal", message0: "%1", args0: [{ type: "field_input", name: "VALUE", text: "Xin chào" }], output: "String", style: "text_blocks" },
    { type: "scc_number_literal", message0: "%1", args0: [{ type: "field_number", name: "VALUE", value: 0 }], output: "Number", style: "loop_blocks" },
    { type: "scc_boolean_literal", message0: "%1", args0: [{ type: "field_checkbox", name: "VALUE", checked: true }], output: "Boolean", style: "logic_blocks" },
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
  if (block.type === "scc_boolean_literal") {
    return { id: block.id, type: "boolean_literal", fields: { value: block.getFieldValue("VALUE") === "TRUE" } };
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
  if (block.type === "scc_if") {
    const conditionBlock = block.getInputTargetBlock("CONDITION");
    return {
      id: block.id,
      type: "if",
      ...(conditionBlock ? { inputs: { condition: parseBlock(conditionBlock) } } : { fields: { condition: block.getFieldValue("CONDITION") !== "FALSE" } }),
      children: readChain(block.getInputTargetBlock("DO")),
    };
  }
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
  if (block.type === "boolean_literal") {
    return { id: block.id, type: "scc_boolean_literal", fields: { VALUE: block.fields?.value ? "TRUE" : "FALSE" } };
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
  if (block.type === "if") {
    result.inputs = {
      ...((result.inputs as Record<string, unknown> | undefined) ?? {}),
      CONDITION: {
        block: block.inputs?.condition
          ? domainBlockToBlockly(block.inputs.condition)
          : { type: "scc_boolean_literal", fields: { VALUE: block.fields?.condition === false ? "FALSE" : "TRUE" } },
      },
    };
    delete fields.CONDITION;
    if (!Object.keys(fields).length) delete result.fields;
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

// Highlight a block so the learner sees which one their command just affected.
// In voice-first mode the selection is also the user's current cursor, so we
// keep it selected instead of fading it out.
function flashBlock(block: Blockly.BlockSvg | null | undefined) {
  if (!block) return;
  try {
    block.select();
  } catch {
    /* selection may fail mid-render — non-critical */
  }
}

function blockKindFromBlocklyType(type: string): BlockKind {
  return (Object.entries(typeMap).find(([, blocklyType]) => blocklyType === type)?.[0] as BlockKind | undefined) ?? "print";
}

function getBlocklyBlockVoiceLabel(block: Blockly.BlockSvg) {
  if (block.type === "scc_start") return "Khi bắt đầu";
  if (block.type === "scc_repeat") return `Lặp ${Number(block.getFieldValue("TIMES") ?? 0)} lần`;
  if (block.type === "scc_if") return "Nếu điều kiện";
  if (block.type === "scc_boolean_literal") return block.getFieldValue("VALUE") === "TRUE" ? "Đúng" : "Sai";
  if (block.type === "scc_variable") return `Đặt ${block.getFieldValue("NAME") ?? "biến"} = ${block.getFieldValue("VALUE") ?? ""}`;
  if (block.type === "scc_print") {
    const reporter = block.getInputTargetBlock("TEXT");
    if (reporter?.type === "scc_variable_get") return `In biến ${reporter.getFieldValue("NAME") ?? ""}`.trim();
    if (reporter?.type === "scc_text_literal") return `In "${reporter.getFieldValue("VALUE") ?? ""}"`;
    return "In";
  }
  return block.type;
}

function walkStatementChain(
  block: Blockly.BlockSvg | null,
  nextRootId: () => string,
  items: VoiceCursorDisplayItem[],
  parentDisplayId?: string,
) {
  let current = block;
  let childIndex = 1;
  while (current) {
    const displayId = parentDisplayId ? `${parentDisplayId}.${childIndex}` : nextRootId();
    items.push({
      blockId: current.id,
      displayId,
      label: getBlocklyBlockVoiceLabel(current),
      parentDisplayId,
      type: blockKindFromBlocklyType(current.type),
    });

    const doChild = current.getInputTargetBlock("DO") as Blockly.BlockSvg | null;
    if (doChild) {
      walkStatementChain(doChild, nextRootId, items, displayId);
    }
    current = current.getNextBlock() as Blockly.BlockSvg | null;
    childIndex += 1;
  }
}

function buildBlocklyVoiceCursorIndex(workspace: Blockly.WorkspaceSvg) {
  const items: VoiceCursorDisplayItem[] = [];
  let rootCounter = 0;
  const nextRootId = () => String((rootCounter += 1));
  const nestedIds = new Set<string>();
  for (const block of workspace.getAllBlocks(false) as Blockly.BlockSvg[]) {
    const parent = block.getSurroundParent();
    if (parent) nestedIds.add(block.id);
  }
  for (const root of workspace.getTopBlocks(true) as Blockly.BlockSvg[]) {
    if (nestedIds.has(root.id)) continue;
    walkStatementChain(root, nextRootId, items);
  }
  return {
    blockIdToDisplayId: Object.fromEntries(items.map((item) => [item.blockId, item.displayId])),
    displayIdToBlockId: Object.fromEntries(items.map((item) => [item.displayId, item.blockId])),
    items,
  };
}

function updateBlocklyVoiceBadges(
  workspace: Blockly.WorkspaceSvg,
  items: VoiceCursorDisplayItem[],
  selectedBlockId: string | null,
  cursorBlockId: string | null,
) {
  const itemByBlockId = new Map(items.map((item) => [item.blockId, item]));
  for (const block of workspace.getAllBlocks(false) as Blockly.BlockSvg[]) {
    const root = block.getSvgRoot();
    if (!root) continue;
    root.classList.toggle("scc-voice-selected", block.id === selectedBlockId);
    root.classList.toggle("scc-voice-cursor", block.id === cursorBlockId);
    root.querySelector("[data-scc-voice-badge]")?.remove();
    const item = itemByBlockId.get(block.id);
    if (!item) continue;
    const badge = Blockly.utils.dom.createSvgElement(
      "g",
      { "data-scc-voice-badge": "true", class: "scc-voice-badge", transform: "translate(6,6)" },
      root,
    );
    Blockly.utils.dom.createSvgElement("rect", { width: Math.max(28, 12 + item.displayId.length * 8), height: 18, rx: 4, ry: 4 }, badge);
    const text = Blockly.utils.dom.createSvgElement("text", { x: 6, y: 13 }, badge);
    text.textContent = item.displayId;
  }
}

function selectedBlockForDisplay(workspace: Blockly.WorkspaceSvg) {
  const selected = Blockly.common.getSelected();
  return selected instanceof Blockly.BlockSvg && selected.workspace === workspace ? selected : null;
}

function stripInstructionText(value: string) {
  return value.replace(/\*\*/g, "").trim();
}

function getActionFieldName(action: LessonStepAction) {
  if (action.kind !== "set_text" && action.kind !== "set_number") return undefined;
  return fieldMap[action.field as keyof typeof fieldMap] ?? action.field.toUpperCase();
}

function normalizeToolboxLabel(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().replace(/\s+/g, " ").trim();
}

export function VoiceLessonClient({
  lesson,
  initialStepIndex = 0,
  initialAllCompleted = false,
  accessibilitySettings = null,
  mode = "authenticated",
}: VoiceLessonClientProps): JSX.Element {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const workspaceStarterSignatureRef = useRef<string | null>(null);
  const suppressEvaluationRef = useRef(false);
  const stepIndexRef = useRef(initialStepIndex);
  const advancingRef = useRef(false);
  const lastTranscriptRef = useRef("");
  const lastAffectedBlockIdRef = useRef<string | null>(null);
  const displayIdToBlockIdRef = useRef<Record<string, string>>({});
  const blockIdToDisplayIdRef = useRef<Record<string, string>>({});
  const completionModalRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const textCommandHandlerRef = useRef<(command: string) => GlobalCommandExecutionResult>((command) => ({
    command,
    feedback: "Workspace đang khởi tạo. Vui lòng thử lại sau giây lát.",
    handled: false,
    target: "workspace",
  }));
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);
  const completedStepIdsRef = useRef(new Set(lesson.steps.filter((_, index) => initialAllCompleted || index < initialStepIndex).map((step) => step.id)));
  const [demoProgressLoaded, setDemoProgressLoaded] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const hintIndexRef = useRef(0);
  const [failCount, setFailCount] = useState(0);
  const [lastFeedback, setLastFeedbackState] = useState<string | null>(null);
  const commandFeedbackRef = useRef<string | null>(null);
  const [voiceLog, setVoiceLog] = useState<string[]>([]);
  const [showSkip, setShowSkip] = useState(false);
  const [runResult, setRunResult] = useState<ProgramExecutionResult | null>(null);
  const [previousStepResult, setPreviousStepResult] = useState<CompletedStepResult | null>(null);
  const [stepNavigationNotice, setStepNavigationNotice] = useState<StepNavigationNotice | null>(null);
  const [lastIntent, setLastIntent] = useState<VoiceIntent | null>(null);
  const [lessonComplete, setLessonComplete] = useState(initialAllCompleted);
  const [announcement, setAnnouncement] = useState({ id: 0, text: "" });
  const [lastCommandResult, setLastCommandResult] = useState<GlobalCommandExecutionResult | null>(null);
  const [completionCommand, setCompletionCommand] = useState("");
  const [voiceCursorItems, setVoiceCursorItems] = useState<VoiceCursorDisplayItem[]>([]);
  const [selectedBlockSummary, setSelectedBlockSummary] = useState<string | null>(null);
  const [insertCursor, setInsertCursor] = useState<InsertCursor>({
    position: "end",
    targetBlockId: null,
    workspaceId: lesson.slug,
  });
  const [pendingAction, setPendingAction] = useState<PendingVoiceAction | null>(null);
  const [voicePrivacyAcknowledged, setVoicePrivacyAcknowledged] = useState(false);
  const [voiceLoggingEnabled, setVoiceLoggingEnabled] = useState(false);
  const [recognizedCommand, setRecognizedCommand] = useState("");
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceRetryKey, setWorkspaceRetryKey] = useState(0);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [toolboxOpen, setToolboxOpen] = useState(true);
  const prevStepIndexRef = useRef(currentStepIndex);
  const speech = useSpeechRecognition();
  const previousSpeechStatusRef = useRef<SpeechAnnouncementState | null>(null);
  const previousFeedbackRef = useRef<string | null>(null);
  const previousRunResultRef = useRef<ProgramExecutionResult | null>(null);
  const previousCommandResultRef = useRef<GlobalCommandExecutionResult | null>(null);
  const previousAnnouncedStepRef = useRef(currentStepIndex);
  const lastAnnouncementRef = useRef("");
  const { commandBarHeight, registerWorkspaceCommand } = useGlobalCommand();
  const currentStep = lesson.steps[currentStepIndex];
  const isDemoMode = mode === "demo";
  const nextLesson = useMemo(() => {
    const all = listSeedV2Lessons();
    const idx = all.findIndex((entry) => entry.slug === lesson.slug);
    return idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
  }, [lesson.slug]);
  const lessonsHref = isDemoMode ? "/demo" : "/lessons-v2";
  const nextLessonHref = nextLesson ? `${isDemoMode ? "/demo" : "/lessons-v2"}/${nextLesson.slug}` : lessonsHref;
  const isChallenge = currentStep?.isChallenge === true;
  const sampleUtterance = currentStep && !isChallenge
    ? extractSampleFromInstructions(currentStep.instructions) ?? deriveSampleUtterance(currentStep.action)
    : null;

  function setLastFeedback(message: string | null) {
    commandFeedbackRef.current = message;
    setLastFeedbackState(message);
  }

  const announce = useCallback((message: string | null, repeatEvent = false) => {
    const next = distinctAnnouncement(lastAnnouncementRef.current, message, repeatEvent);
    if (!next) return;
    lastAnnouncementRef.current = next;
    setAnnouncement((current) => ({ id: current.id + 1, text: next }));
  }, []);

  useEffect(() => {
    const current: SpeechAnnouncementState = {
      errorMessage: speech.errorMessage,
      isListening: speech.isListening,
      isSupportKnown: speech.isSupportKnown,
      isSupported: speech.isSupported,
    };
    const fallback = lessonComplete
      ? "Em có thể nhập lệnh trong hộp thoại hoàn thành."
      : "Em có thể dùng thanh Nhập lệnh ở cuối màn hình.";
    announce(speechStatusAnnouncement(previousSpeechStatusRef.current, current, fallback));
    previousSpeechStatusRef.current = current;
  }, [announce, lessonComplete, speech.errorMessage, speech.isListening, speech.isSupportKnown, speech.isSupported]);

  useEffect(() => {
    const stepChanged = currentStepIndex !== previousAnnouncedStepRef.current;
    const feedbackChanged = lastFeedback !== previousFeedbackRef.current;
    const runChanged = runResult !== previousRunResultRef.current;
    const commandChanged = lastCommandResult !== previousCommandResultRef.current;
    const message = stepChanged
      ? null
      : runChanged && runResult
      ? programResultAnnouncement(runResult, lastFeedback)
      : feedbackChanged && lastFeedback
        ? conciseAnnouncement(lastFeedback)
        : commandChanged && lastCommandResult
          ? commandFeedbackAnnouncement(lastCommandResult)
          : null;
    announce(message, feedbackChanged || runChanged || commandChanged);
    previousFeedbackRef.current = lastFeedback;
    previousRunResultRef.current = runResult;
    previousCommandResultRef.current = lastCommandResult;
  }, [announce, currentStepIndex, lastCommandResult, lastFeedback, runResult]);

  useEffect(() => {
    if (currentStepIndex === previousAnnouncedStepRef.current) return;
    previousAnnouncedStepRef.current = currentStepIndex;
    const step = lesson.steps[currentStepIndex];
    if (!step) return;
    const completed = previousStepResult?.toStepIndex === currentStepIndex ? previousStepResult : null;
    const navigation = stepNavigationNotice?.targetIndex === currentStepIndex ? stepNavigationNotice : null;
    announce(completed
      ? completedStepAnnouncement(completed, step.title)
      : navigation?.feedback ?? `Đang ở bước ${currentStepIndex + 1}: ${step.title}.`);
  }, [announce, currentStepIndex, lesson.steps, previousStepResult, stepNavigationNotice]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setVoicePrivacyAcknowledged(hasAcknowledgedVoiceProcessing(window.localStorage));
  }, []);

  useEffect(() => {
    if (!isDemoMode || typeof window === "undefined") return;
    const progress = readDemoProgressFromStorage(window.localStorage, lesson.slug);
    completedStepIdsRef.current = new Set(progress.completedStepIds);
    const nextIndex = Math.min(progress.currentStepIndex, Math.max(lesson.steps.length - 1, 0));
    const allCompleted = lesson.steps.length > 0 && lesson.steps.every((step) => progress.completedStepIds.includes(step.id));
    setCurrentStepIndex(nextIndex);
    setLessonComplete(allCompleted);
    setDemoProgressLoaded(true);
  }, [isDemoMode, lesson.slug, lesson.steps]);

  useEffect(() => {
    stepIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);

  useEffect(() => {
    // Client-side lesson changes (rare — App Router does full navigation)
    // reset to the resume point derived from persisted progress.
    if (isDemoMode) return;
    setCurrentStepIndex(initialStepIndex);
    setLessonComplete(initialAllCompleted);
  }, [lesson.id, initialStepIndex, initialAllCompleted, isDemoMode]);

  useEffect(() => {
    setFailCount(0);
    setLastFeedback(null);
    setShowSkip(false);
    hintIndexRef.current = 0;
    setHintIndex(0);
    setRunResult(null);
    setPreviousStepResult((result) => result?.toStepIndex === currentStepIndex ? result : null);
    setLastIntent(null);
    setPendingAction(null);
    // Hold the advancing guard briefly while Blockly's load events for the
    // new step's starterWorkspace flush; otherwise the change listener can
    // fire on the burst and re-evaluate against the previous step.
    advancingRef.current = true;
    const id = window.setTimeout(() => {
      advancingRef.current = false;
    }, 250);
    return () => window.clearTimeout(id);
  }, [currentStepIndex]);

  useEffect(() => {
    setInsertCursor({ position: "end", targetBlockId: null, workspaceId: lesson.slug });
    setVoiceCursorItems([]);
    displayIdToBlockIdRef.current = {};
    blockIdToDisplayIdRef.current = {};
    lastAffectedBlockIdRef.current = null;
  }, [lesson.slug]);

  // Reset lessonComplete if the user navigates away from the last step
  // (e.g. via the sidebar or "Bước trước"). The completion card should only
  // appear when the learner is genuinely on the final completed step.
  useEffect(() => {
    if (isDemoMode && !demoProgressLoaded) return;
    if (currentStepIndex < lesson.steps.length - 1) setLessonComplete(false);
  }, [currentStepIndex, demoProgressLoaded, isDemoMode, lesson.steps.length]);

  useEffect(() => {
    if (failCount >= 3) setShowSkip(true);
  }, [failCount]);

  useEffect(() => {
    if (!isDemoMode || !demoProgressLoaded || typeof window === "undefined") return;
    const current = readDemoProgressFromStorage(window.localStorage, lesson.slug);
    if (current.currentStepIndex === currentStepIndex) return;
    writeDemoProgressToStorage(window.localStorage, lesson.slug, {
      ...current,
      currentStepIndex,
      updatedAt: new Date().toISOString(),
    });
  }, [currentStepIndex, demoProgressLoaded, isDemoMode, lesson.slug]);

  function performStepNavigation(targetIndex: number, command: string): GlobalCommandExecutionResult {
    const target = lesson.steps[targetIndex]!;
    const hasBlocks = Boolean(workspaceRef.current?.getAllBlocks(false).length);
    const replacesWorkspace = willReplaceWorkspace(currentStepIndex, targetIndex, hasBlocks);
    const feedback = `Đã chuyển đến bước ${targetIndex + 1}: ${target.title}. ${replacesWorkspace
      ? "Workspace đã nạp nội dung bắt đầu của bước này."
      : "Các khối hiện tại được giữ lại."}`;
    setPendingAction(null);
    setPreviousStepResult(null);
    setRunResult(null);
    setUndoSnapshot(null);
    setLastCommandResult(null);
    setInsertCursor({ position: "end", targetBlockId: null, workspaceId: lesson.slug });
    if (replacesWorkspace) {
      setVoiceCursorItems([]);
      setSelectedBlockSummary(null);
    }
    lastAffectedBlockIdRef.current = null;
    setStepNavigationNotice({ targetIndex, feedback });
    setLastFeedback(null);
    setCurrentStepIndex(targetIndex);
    return makeWorkspaceCommandResult(command, feedback, true, `đến bước ${targetIndex + 1}`, null, "applied");
  }

  function requestStepNavigation(targetIndex: number, command: string, ignorePending = false): GlobalCommandExecutionResult {
    if (pendingAction && !ignorePending) {
      const feedback = "Hãy xác nhận hoặc hủy thao tác đang chờ trước khi chuyển bước.";
      setLastFeedback(feedback);
      return makeWorkspaceCommandResult(command, feedback, false, undefined, pendingAction.preview, "pending");
    }
    const workspace = workspaceRef.current;
    const hasBlocks = Boolean(workspace?.getAllBlocks(false).length);
    const currentSignature = workspace
      ? workspaceContentSignature(Blockly.serialization.workspaces.save(workspace) as Record<string, unknown>)
      : null;
    const plan = planStepNavigation(
      currentStepIndex,
      targetIndex,
      lesson.steps.length,
      hasBlocks,
      currentSignature !== null && currentSignature === workspaceStarterSignatureRef.current,
    );
    if (plan.status !== "navigate") {
      const feedback = plan.status === "same"
        ? `Em đang ở bước ${currentStepIndex + 1}.`
        : "Không tìm thấy bước học được yêu cầu.";
      setLastFeedback(feedback);
      return makeWorkspaceCommandResult(command, feedback, false, undefined, null, "not_applied");
    }
    if (plan.needsConfirmation) {
      const preview = `Chuyển đến bước ${targetIndex + 1} sẽ thay các khối hiện tại bằng nội dung bắt đầu của bước đó. Nói “đúng rồi” để tiếp tục hoặc “hủy” để giữ nguyên.`;
      setPendingAction({ kind: "step_navigation", fromStepIndex: currentStepIndex, targetIndex, preview });
      setStepNavigationNotice(null);
      setLastFeedback(preview);
      return makeWorkspaceCommandResult(command, preview, true, `đến bước ${targetIndex + 1}`, preview, "pending");
    }
    return performStepNavigation(targetIndex, command);
  }

  function prevStep() {
    requestStepNavigation(currentStepIndex - 1, "bước trước");
  }

  function nextStep() {
    return requestStepNavigation(currentStepIndex + 1, "bước sau");
  }

  function targetStepIndex(intent: Extract<VoiceIntent, { kind: "navigate_step" }>) {
    if (intent.target === "previous") return currentStepIndex - 1;
    if (intent.target === "next") return currentStepIndex + 1;
    return (intent.stepNumber ?? 0) - 1;
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
      setRunResult(null);
      setStepNavigationNotice(null);
      setCurrentStepIndex((index) => Math.min(lesson.steps.length - 1, index + 1));
    }
  }

  function markStepPassed() {
    // For the final step, mark the whole lesson complete so the celebration
    // overlay takes over. Intermediate steps just advance via resetAfterSuccess.
    if (currentStepIndex >= lesson.steps.length - 1) {
      const firstIncomplete = lesson.steps.findIndex((step) => !completedStepIdsRef.current.has(step.id));
      if (firstIncomplete === -1) setLessonComplete(true);
      else {
        setLastFeedback(`Bước cuối đã xong. Hãy hoàn thành bước ${firstIncomplete + 1} trước khi kết thúc bài.`);
        setCurrentStepIndex(firstIncomplete);
      }
    }
  }

  function inferBlocklyTypeFromField(action: LessonStepAction): string | null {
    if (action.kind === "set_variable_output") return "scc_print";
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

  function getSelectedBlock() {
    const workspace = workspaceRef.current;
    return workspace ? selectedBlockForDisplay(workspace) : null;
  }

  function getLastAffectedBlock(workspace: Blockly.WorkspaceSvg) {
    return lastAffectedBlockIdRef.current ? (workspace.getBlockById(lastAffectedBlockIdRef.current) as Blockly.BlockSvg | null) : null;
  }

  function refreshVoiceCursor() {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const index = buildBlocklyVoiceCursorIndex(workspace);
    displayIdToBlockIdRef.current = index.displayIdToBlockId;
    blockIdToDisplayIdRef.current = index.blockIdToDisplayId;
    setVoiceCursorItems(index.items);
    const selectedId = selectedBlockForDisplay(workspace)?.id ?? null;
    const selectedItem = index.items.find((item) => item.blockId === selectedId);
    setSelectedBlockSummary(selectedItem ? `Khối ${selectedItem.displayId}: ${selectedItem.label}` : null);
    updateBlocklyVoiceBadges(workspace, index.items, selectedId, insertCursor.targetBlockId);
  }

  function displayIdForBlock(block: Blockly.BlockSvg | null | undefined) {
    if (!block) return undefined;
    return blockIdToDisplayIdRef.current[block.id];
  }

  function getBlockByDisplayId(workspace: Blockly.WorkspaceSvg, displayId: string) {
    let blockId = displayIdToBlockIdRef.current[displayId];
    if (!blockId) {
      const index = buildBlocklyVoiceCursorIndex(workspace);
      displayIdToBlockIdRef.current = index.displayIdToBlockId;
      blockIdToDisplayIdRef.current = index.blockIdToDisplayId;
      setVoiceCursorItems(index.items);
      blockId = index.displayIdToBlockId[displayId];
    }
    return blockId ? (workspace.getBlockById(blockId) as Blockly.BlockSvg | null) : null;
  }

  function describeBlock(block: Blockly.BlockSvg | null | undefined) {
    if (!block) return "chưa có khối";
    const displayId = displayIdForBlock(block);
    return displayId ? `khối ${displayId}: ${getBlocklyBlockVoiceLabel(block)}` : getBlocklyBlockVoiceLabel(block);
  }

  function setCursorForBlock(block: Blockly.BlockSvg | null, position: InsertCursorPosition) {
    setInsertCursor({
      position,
      targetBlockId: block?.id ?? null,
      targetDisplayId: displayIdForBlock(block),
      workspaceId: lesson.slug,
      inputName: position === "inside" ? "DO" : undefined,
    });
  }

  function resolveInsertCursorTarget(
    workspace: Blockly.WorkspaceSvg,
    intent: Extract<VoiceIntent, { kind: "set_insert_cursor" }>,
  ) {
    const index = buildBlocklyVoiceCursorIndex(workspace);
    displayIdToBlockIdRef.current = index.displayIdToBlockId;
    blockIdToDisplayIdRef.current = index.blockIdToDisplayId;
    setVoiceCursorItems(index.items);
    if (intent.target === "display_id") {
      return intent.displayId ? getBlockByDisplayId(workspace, intent.displayId) : null;
    }
    if (intent.target === "last") {
      const last = index.items[index.items.length - 1];
      return last ? (workspace.getBlockById(last.blockId) as Blockly.BlockSvg | null) : null;
    }
    if (intent.target === "main") {
      return (workspace.getTopBlocks(true) as Blockly.BlockSvg[]).find((candidate) => candidate.type === "scc_start") ?? null;
    }
    return getSelectedBlock() ?? getLastAffectedBlock(workspace);
  }

  function cursorPositionLabel(cursor: InsertCursor) {
    if (cursor.position === "end") return "cuối chương trình";
    const target = cursor.targetDisplayId ? `khối ${cursor.targetDisplayId}` : "khối đang chọn";
    return {
      after: `sau ${target}`,
      before: `trước ${target}`,
      inside: `bên trong ${target}`,
      end: "cuối chương trình",
    }[cursor.position];
  }

  function setBlocklyToolboxOpen(open: boolean) {
    setToolboxOpen(open);
    const workspace = workspaceRef.current;
    const toolboxInstance = workspace?.getToolbox();
    toolboxInstance?.setVisible(open);
    if (!open) toolboxInstance?.setSelectedItem(null);
    if (workspace) {
      const root = workspace.getInjectionDiv();
      const elements = Array.from(root.querySelectorAll<HTMLElement>(".blocklyToolboxDiv, .blocklyFlyout"));
      elements.forEach((element) => {
        element.style.display = open ? "" : "none";
        element.style.visibility = open ? "" : "hidden";
        if (open) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", "true");
      });
      toolboxInstance?.position();
      Blockly.svgResize(workspace);
      window.setTimeout(() => Blockly.svgResize(workspace), 0);
    }
  }

  function getToolboxItems(toolboxInstance: Blockly.IToolbox) {
    type ToolboxWithItems = Blockly.IToolbox & {
      getToolboxItemById?: (id: string) => Blockly.IToolboxItem | null;
      getToolboxItems: () => Blockly.IToolboxItem[];
    };
    return toolboxInstance as ToolboxWithItems;
  }

  function openBlocklyToolboxCategory(category: ToolboxCategoryId) {
    const workspace = workspaceRef.current;
    const toolboxInstance = workspace?.getToolbox();
    if (!workspace || !toolboxInstance) {
      setLastFeedback("Không tìm thấy danh sách khối.");
      return false;
    }
    setBlocklyToolboxOpen(true);
    const expectedLabel = normalizeToolboxLabel(TOOLBOX_CATEGORY_LABEL[category]);
    const toolboxWithItems = getToolboxItems(toolboxInstance);
    const item = toolboxWithItems.getToolboxItemById?.(category) ?? toolboxWithItems.getToolboxItems().find((candidate) => {
      const id = candidate.getId();
      const label = normalizeToolboxLabel(candidate.getDiv()?.textContent ?? "");
      return id === category || label === expectedLabel;
    });
    if (!item) {
      setLastFeedback("Không tìm thấy nhóm khối này.");
      return false;
    }
    if (toolboxInstance.getSelectedItem()?.getId() === item.getId()) {
      setLastFeedback(`Nhóm khối ${TOOLBOX_CATEGORY_LABEL[category]} đã mở.`);
      return false;
    }
    toolboxInstance.setSelectedItem(item);
    toolboxInstance.refreshSelection();
    item.getDiv()?.scrollIntoView({ block: "nearest" });
    Blockly.svgResize(workspace);
    setLastFeedback(`Đã mở nhóm khối ${TOOLBOX_CATEGORY_LABEL[category]}.`);
    return true;
  }

  function centerBlockInWorkspace(workspace: Blockly.WorkspaceSvg, block: Blockly.BlockSvg | null, missingMessage: string) {
    if (!block) {
      setLastFeedback(missingMessage);
      return false;
    }
    workspace.centerOnBlock(block.id, true);
    setLastFeedback(`Đã đưa ${describeBlock(block)} về giữa.`);
    return true;
  }

  function applyWorkspaceViewportAction(intent: Extract<VoiceIntent, { kind: "pan_workspace" | "center_workspace" | "zoom_workspace" }>) {
    const workspace = workspaceRef.current;
    if (!workspace) {
      setLastFeedback("Workspace chưa sẵn sàng.");
      return { applied: false, changed: false, shouldEvaluate: false };
    }
    if (intent.kind === "pan_workspace") {
      const metrics = workspace.getMetricsManager().getMetrics();
      const next = calculateWorkspacePanTarget(metrics, intent.direction);
      workspace.scroll(next.x, next.y);
      const after = workspace.getMetricsManager().getMetrics();
      const moved = Math.abs(after.viewLeft - metrics.viewLeft) > 0.5 || Math.abs(after.viewTop - metrics.viewTop) > 0.5;
      if (!moved) {
        setLastFeedback("Workspace đã ở mép này. Em có thể cuộn theo hướng khác hoặc nói: vừa màn hình.");
        return { applied: false, changed: false, shouldEvaluate: false };
      }
      setLastFeedback(
        {
          down: "Đã cuộn workspace xuống.",
          left: "Đã cuộn workspace sang trái.",
          right: "Đã cuộn workspace sang phải.",
          up: "Đã cuộn workspace lên.",
        }[intent.direction],
      );
      return { applied: true, changed: false, shouldEvaluate: false };
    }
    if (intent.kind === "center_workspace") {
      if (intent.target === "selected_block") {
        const applied = centerBlockInWorkspace(workspace, getSelectedBlock() ?? getLastAffectedBlock(workspace), "Chưa có khối đang chọn để đưa về giữa.");
        return { applied, changed: false, shouldEvaluate: false };
      }
      if (intent.target === "display_id") {
        const applied = centerBlockInWorkspace(
          workspace,
          intent.displayId ? getBlockByDisplayId(workspace, intent.displayId) : null,
          `Không tìm thấy khối ${intent.displayId}. Vị trí workspace không bị thay đổi.`,
        );
        return { applied, changed: false, shouldEvaluate: false };
      }
      const start = (workspace.getTopBlocks(true) as Blockly.BlockSvg[]).find((candidate) => candidate.type === "scc_start") ?? null;
      if (start) workspace.centerOnBlock(start.id);
      else workspace.zoomToFit();
      setLastFeedback("Đã đưa chương trình về giữa.");
      return { applied: true, changed: false, shouldEvaluate: false };
    }
    if (intent.level === "fit") {
      workspace.zoomToFit();
      workspace.setScale(clampWorkspaceScale(workspace.scale, 0.7, 0.85));
      setLastFeedback("Đã hiển thị toàn bộ chương trình vừa màn hình.");
      return { applied: true, changed: false, shouldEvaluate: false };
    }
    if (intent.level === "reset") {
      const wasDefaultScale = Math.abs(workspace.scale - 0.85) < 0.001;
      workspace.setScale(0.85);
      const start = (workspace.getTopBlocks(true) as Blockly.BlockSvg[]).find((candidate) => candidate.type === "scc_start") ?? null;
      if (start) workspace.centerOnBlock(start.id);
      setLastFeedback(wasDefaultScale && !start ? "Zoom đã ở mức mặc định." : "Đã đặt lại zoom workspace.");
      return { applied: !wasDefaultScale || Boolean(start), changed: false, shouldEvaluate: false };
    }
    const nextScale = clampWorkspaceScale(workspace.scale * (intent.level === "in" ? 1.15 : 0.87));
    if (Math.abs(nextScale - workspace.scale) < 0.001) {
      setLastFeedback(intent.level === "in" ? "Đã ở mức phóng to tối đa." : "Đã ở mức thu nhỏ tối đa.");
      return { applied: false, changed: false, shouldEvaluate: false };
    }
    workspace.setScale(nextScale);
    Blockly.svgResize(workspace);
    setLastFeedback(intent.level === "in" ? "Đã phóng to workspace." : "Đã thu nhỏ workspace.");
    return { applied: true, changed: false, shouldEvaluate: false };
  }

  function isBlockCompatibleWithAction(block: Blockly.BlockSvg, action: LessonStepAction) {
    if (action.kind === "set_variable_output") return block.type === "scc_print" || block.id === action.blockId;
    if (action.kind !== "set_text" && action.kind !== "set_number") return true;
    if (action.blockId && block.id === action.blockId) return true;
    const inferred = inferBlocklyTypeFromField(action);
    return inferred ? block.type === inferred : true;
  }

  function rememberAffectedBlock(block: Blockly.BlockSvg | null | undefined) {
    if (!block) return;
    lastAffectedBlockIdRef.current = block.id;
    block.select();
    setCursorForBlock(block, "after");
    flashBlock(block);
  }

  function findPreferredBlockByType(workspace: Blockly.WorkspaceSvg, blocklyType: string) {
    const selected = getSelectedBlock();
    if (selected?.type === blocklyType) return selected;
    const lastAffected = getLastAffectedBlock(workspace);
    if (lastAffected?.type === blocklyType) return lastAffected;
    const all = workspace.getAllBlocks(false) as Blockly.BlockSvg[];
    for (let i = all.length - 1; i >= 0; i--) {
      const block = all[i];
      if (block?.type === blocklyType) return block;
    }
    return null;
  }

  function resolveTargetBlock(workspace: Blockly.WorkspaceSvg, action: LessonStepAction) {
    if (action.kind === "set_text" || action.kind === "set_number" || action.kind === "set_variable_output") {
      // 1. Explicit UI selection wins when it matches the requested edit.
      const selected = getSelectedBlock();
      if (selected && isBlockCompatibleWithAction(selected, action)) return selected;

      // 2. Voice-created / recently edited block is the next best target.
      const lastAffected = getLastAffectedBlock(workspace);
      if (lastAffected && isBlockCompatibleWithAction(lastAffected, action)) return lastAffected;

      // 3. Try the seed's blockId (works when starter loaded fresh).
      if (action.blockId) {
        const byId = workspace.getBlockById(action.blockId);
        if (byId) return byId;
      }
      // 4. Fallback: infer the Blockly type from the action's field name
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
      // 5. Final fallback: selected block even if it is not a perfect match.
      if (selected) return selected;
    }
    return getSelectedBlock();
  }

  function isBlockCompatibleWithVoiceEdit(block: Blockly.BlockSvg, intent: Extract<VoiceIntent, { kind: "set_text" | "set_number" | "set_variable_output" }>) {
    if (intent.kind === "set_variable_output") return block.type === "scc_print";
    if (intent.kind === "set_text") {
      return block.type === "scc_print" || Boolean(block.getField("TEXT")) || Boolean(block.getField("VALUE")) || Boolean(block.getField("NAME"));
    }
    return Boolean(block.getField("TIMES")) || Boolean(block.getField("VALUE"));
  }

  function findRecentEditableBlock(workspace: Blockly.WorkspaceSvg, intent: Extract<VoiceIntent, { kind: "set_text" | "set_number" | "set_variable_output" }>) {
    const preferredTypes =
      intent.kind === "set_number"
        ? ["scc_repeat", "scc_number_literal", "scc_variable"]
        : ["scc_print", "scc_text_literal", "scc_variable"];
    const all = workspace.getAllBlocks(false) as Blockly.BlockSvg[];
    for (let i = all.length - 1; i >= 0; i--) {
      const block = all[i];
      if (block && preferredTypes.includes(block.type) && isBlockCompatibleWithVoiceEdit(block, intent)) return block;
    }
    return null;
  }

  function resolveVoiceEditTargetBlock(
    workspace: Blockly.WorkspaceSvg,
    intent: Extract<VoiceIntent, { kind: "set_text" | "set_number" | "set_variable_output" }>,
  ) {
    const selected = getSelectedBlock();
    let fallback: Blockly.BlockSvg | null = null;
    if (!selected) {
      const lastAffected = getLastAffectedBlock(workspace);
      if (lastAffected && isBlockCompatibleWithVoiceEdit(lastAffected, intent)) fallback = lastAffected;
      if (!fallback && currentStep?.action.kind === intent.kind) {
        const stepTarget = resolveTargetBlock(workspace, currentStep.action);
        if (stepTarget && isBlockCompatibleWithVoiceEdit(stepTarget as Blockly.BlockSvg, intent)) fallback = stepTarget as Blockly.BlockSvg;
      }
      fallback ??= findRecentEditableBlock(workspace, intent);
    }
    return resolveAuthoritativeEditTarget({
      fallback,
      isCompatible: (block) => isBlockCompatibleWithVoiceEdit(block, intent),
      selected,
    });
  }

  function incompatibleEditSelectionFeedback(intent: Extract<VoiceIntent, { kind: "set_text" | "set_number" | "set_variable_output" }>) {
    if (intent.kind === "set_variable_output") return "Khối đang chọn không thể in biến. Hãy chọn một khối in rồi thử lại.";
    if (intent.kind === "set_text") return "Khối đang chọn không có ô chữ. Hãy chọn một khối in, chữ hoặc biến rồi thử lại.";
    return "Khối đang chọn không có ô số. Hãy chọn một khối lặp, số hoặc biến rồi thử lại.";
  }

  function resolveFieldName(block: Blockly.Block, action: LessonStepAction, defaults: string[]) {
    const preferred = getActionFieldName(action);
    const candidates = preferred ? [preferred, action.kind === "set_text" || action.kind === "set_number" ? action.field : "", ...defaults] : defaults;
    return candidates.find((name) => name && Boolean(block.getField(name)));
  }

  function advanceHint() {
    const next = nextLessonHint(currentStep?.hints ?? [], hintIndexRef.current);
    if (!next) return null;
    hintIndexRef.current = next.index;
    setHintIndex(next.index);
    return next.feedback;
  }

  function deliverHintFeedback(feedback: string, evaluation: LessonStepEvaluationResult | null) {
    if (evaluation?.completed && currentStepIndex < lesson.steps.length - 1) {
      setPreviousStepResult((result) => completedStepWithFeedback(result, currentStepIndex, feedback));
      return;
    }
    setLastFeedback(feedback);
  }

  function requestHintFromButton() {
    setStepNavigationNotice(null);
    const feedback = advanceHint();
    if (!feedback) {
      setLastFeedback("Bước này chưa có gợi ý để xem.");
      return;
    }
    const evaluation = currentStep.action.kind === "ask_hint" ? evaluateAndMaybeAdvance({ kind: "ask_hint" }) : null;
    deliverHintFeedback(feedback, evaluation);
  }

  function captureUndoSnapshot(label: string) {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    setUndoSnapshot({
      label,
      state: Blockly.serialization.workspaces.save(workspace) as Record<string, unknown>,
    });
  }

  function restoreUndoSnapshot() {
    const workspace = workspaceRef.current;
    if (!workspace || !undoSnapshot) {
      setLastFeedback("Chưa có thao tác nào để hoàn tác.");
      return false;
    }
    suppressEvaluationRef.current = true;
    workspace.clear();
    Blockly.serialization.workspaces.load(undoSnapshot.state, workspace);
    setUndoSnapshot(null);
    setPendingAction(null);
    setLastFeedback(`Đã hoàn tác: ${undoSnapshot.label}.`);
    window.setTimeout(() => {
      suppressEvaluationRef.current = false;
      refreshVoiceCursor();
    }, 50);
    return true;
  }

  // Fire-and-forget persistence when a step passes. The server action is
  // already resilient to auth/RLS/migration gaps, but we also catch here so
  // any unexpected rejection (network drop, DNS flake) never surfaces to
  // the learner as an unhandled promise rejection.
  function persistStepCompleted(stepId: string) {
    completedStepIdsRef.current.add(stepId);
    if (!shouldUseServerPersistence(mode)) {
      if (typeof window !== "undefined") {
        const current = readDemoProgressFromStorage(window.localStorage, lesson.slug);
        const nextIndex = Math.min(stepIndexRef.current + 1, Math.max(lesson.steps.length - 1, 0));
        writeDemoProgressToStorage(
          window.localStorage,
          lesson.slug,
          markDemoStepCompleted(current, stepId, nextIndex),
        );
      }
      return;
    }
    void markLessonV2StepCompletedAction(lesson.slug, stepId)
      .then((result) => {
        if (!result.ok) setLastFeedback("Không thể lưu tiến độ lên tài khoản, nhưng bạn vẫn có thể tiếp tục học.");
      })
      .catch(() => {
        setLastFeedback("Không thể lưu tiến độ lên tài khoản, nhưng bạn vẫn có thể tiếp tục học.");
      });
  }

  function persistProgramRun(program: ProgramWorkspace, exec: ProgramExecutionResult) {
    if (!currentStep) return;
    if (!shouldUseServerPersistence(mode)) return;
    void fetch("/api/program-runs", {
      body: JSON.stringify({
        executionResult: exec,
        lessonId: lesson.databaseLessonId,
        lessonStepId: currentStep.databaseStepId,
        workspaceState: program,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => {
      /* analytics persistence is best-effort */
    });
  }

  function persistVoiceCommandLog(transcript: string, intent: VoiceIntent, outcome: LessonIntentApplication) {
    if (!currentStep) return;
    if (!shouldPersistVoiceCommandLog(mode, voiceLoggingEnabled)) return;
    const isUnknown = intent.kind === "unknown";
    const applied = outcome.applied ?? outcome.changed;
    const status = isUnknown ? "unsupported" : applied ? "success" : "error";
    void fetch("/api/voice-command-logs", {
      body: JSON.stringify({
        failureReason: isUnknown ? intent.reason : status === "error" ? "intent_not_applied" : null,
        lessonId: lesson.databaseLessonId,
        lessonStepId: currentStep.databaseStepId,
        normalizedTranscript: transcript.trim().toLowerCase(),
        parsedAction: { ...intent, type: intent.kind },
        status,
        transcript,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => {
      /* analytics persistence is best-effort */
    });
  }

  function evaluateAndMaybeAdvance(intent?: VoiceIntent): LessonStepEvaluationResult | null {
    if (advancingRef.current) return null;
    const workspace = workspaceRef.current;
    if (!workspace || !currentStep) return null;
    if (currentStep.action.kind === "ask_hint" && intent?.kind !== "ask_hint") return null;
    if (currentStep.action.kind === "run_program" && intent?.kind !== "run_program") return null;
    // Only run_program is allowed to evaluate without an explicit user intent.
    // Bare workspace events (CREATE/MOVE bursts during load) must NOT trigger
    // an unrelated step's evaluator — they previously caused 1->4 cascades.
    if (!intent && currentStep.action.kind !== "set_text" && currentStep.action.kind !== "set_number" && currentStep.action.kind !== "set_variable_output" && currentStep.action.kind !== "insert_into" && currentStep.action.kind !== "add_block") {
      return null;
    }
    const program = toProgram(workspace);
    const exec = intent?.kind === "run_program" ? executeProgram(program) : SUCCESS_EXECUTION;
    if (intent?.kind === "run_program") {
      persistProgramRun(program, exec);
    }
    const evaluation = evaluateStepAction(currentStep.action, program, exec);
    if (intent?.kind === "run_program" && (!evaluation.completed || currentStepIndex >= lesson.steps.length - 1)) {
      setRunResult(exec);
    }
    if (evaluation.completed) {
      if (currentStepIndex >= lesson.steps.length - 1 && intent?.kind !== "ask_hint") setLastFeedback(evaluation.feedback);
      const completed = completedStepResult(
        evaluation,
        currentStepIndex,
        lesson.steps.length,
        currentStep.title,
        intent?.kind === "run_program" ? exec : null,
      );
      setPreviousStepResult(completed);
      persistStepCompleted(currentStep.id);
      markStepPassed();
      resetAfterSuccess(currentStepIndex < lesson.steps.length - 1);
      return evaluation;
    }
    setLastFeedback(evaluation.feedback);
    setFailCount((count) => count + 1);
    return evaluation;
  }

  function runProgramFromButton() {
    setStepNavigationNotice(null);
    const workspace = workspaceRef.current;
    if (!workspace || !currentStep) return;
    const program = toProgram(workspace);
    const exec = executeProgram(program);
    persistProgramRun(program, exec);
    if (currentStep.action.kind !== "run_program") {
      setRunResult(exec);
      setLastFeedback("Đã chạy chương trình. Hãy thực hiện yêu cầu của bước hiện tại để tiếp tục.");
      return;
    }
    const evaluation = evaluateStepAction(currentStep.action, program, exec);
    if (!evaluation.completed || currentStepIndex >= lesson.steps.length - 1) setRunResult(exec);
    if (evaluation.completed) {
      if (currentStepIndex >= lesson.steps.length - 1) setLastFeedback(evaluation.feedback);
      const completed = completedStepResult(evaluation, currentStepIndex, lesson.steps.length, currentStep.title, exec);
      setPreviousStepResult(completed);
      persistStepCompleted(currentStep.id);
      markStepPassed();
      resetAfterSuccess(currentStepIndex < lesson.steps.length - 1);
    } else {
      setLastFeedback(evaluation.feedback);
      setFailCount((count) => count + 1);
    }
  }

  function setFieldFromIntent(intent: Extract<VoiceIntent, { kind: "set_text" | "set_number" }>) {
    const workspace = workspaceRef.current;
    if (!workspace || !currentStep) return false;
    const resolution = resolveVoiceEditTargetBlock(workspace, intent);
    if (resolution.incompatibleSelection) {
      setLastFeedback(incompatibleEditSelectionFeedback(intent));
      return false;
    }
    const target = resolution.target;
    if (!target) {
      setLastFeedback(intent.kind === "set_text" ? "Hãy chọn khối trước khi đặt chữ." : "Hãy chọn khối trước khi đặt số.");
      return false;
    }
    if (resolution.usedFallback) {
      target.select();
      refreshVoiceCursor();
    }
    const value = intent.kind === "set_text" ? intent.text : String(intent.value);
    // Special-case scc_print: TEXT is a value_input slot, not a field. We
    // write the new value into the connected text_literal reporter (creating
    // one if the slot is empty).
    if (target.type === "scc_print" && intent.kind === "set_text") {
      if (!target.getInput("TEXT")?.connection) {
        setLastFeedback("Khối in đang chọn không có ô chữ. Hãy chọn hoặc thêm một khối in khác.");
        return false;
      }
      let textLiteral = target.getInputTargetBlock("TEXT") as Blockly.BlockSvg | null;
      if (textLiteral?.type === "scc_text_literal" && String(textLiteral.getFieldValue("VALUE") ?? "") === value) {
        setLastFeedback(`Khối in đã có nội dung “${value}”. Em có thể chọn khối khác hoặc tiếp tục.`);
        return false;
      }
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
      if (String(textLiteral.getFieldValue("VALUE") ?? "") !== value) {
        setLastFeedback("Chưa đặt được chữ vào khối in. Hãy thử lại hoặc chọn một khối in khác.");
        return false;
      }
      rememberAffectedBlock(target as Blockly.BlockSvg);
      return true;
    }
    const fieldName = resolveFieldName(target, currentStep.action, intent.kind === "set_text" ? ["TEXT", "VALUE", "NAME"] : ["TIMES", "VALUE"]);
    if (!fieldName) {
      setLastFeedback("Không tìm thấy ô dữ liệu phù hợp trong khối đang chọn.");
      return false;
    }
    const previousValue = String(target.getFieldValue(fieldName) ?? "");
    if (previousValue === value) {
      setLastFeedback(`Giá trị đã là “${value}”. Em có thể chọn khối khác hoặc tiếp tục.`);
      return false;
    }
    target.setFieldValue(value, fieldName);
    if (String(target.getFieldValue(fieldName) ?? "") === previousValue) {
      setLastFeedback("Giá trị trong khối chưa thay đổi. Hãy kiểm tra khối đang chọn rồi thử lại.");
      return false;
    }
    rememberAffectedBlock(target as Blockly.BlockSvg);
    return true;
  }

  function setVariableOutputFromIntent(intent: Extract<VoiceIntent, { kind: "set_variable_output" }>) {
    const workspace = workspaceRef.current;
    if (!workspace || !currentStep) return false;
    const resolution = resolveVoiceEditTargetBlock(workspace, intent);
    if (resolution.incompatibleSelection) {
      setLastFeedback(incompatibleEditSelectionFeedback(intent));
      return false;
    }
    const target = resolution.target;
    if (!target || target.type !== "scc_print") {
      setLastFeedback("Hãy chọn khối in trước khi nói in biến.");
      return false;
    }
    if (resolution.usedFallback) {
      target.select();
      refreshVoiceCursor();
    }
    const currentInput = target.getInputTargetBlock("TEXT") as Blockly.BlockSvg | null;
    if (currentInput?.type === "scc_variable_get" && String(currentInput.getFieldValue("NAME") ?? "") === intent.name) {
      setLastFeedback(`Khối in đã dùng biến ${intent.name}. Em có thể tiếp tục.`);
      return false;
    }
    if (!target.getInput("TEXT")?.connection) {
      setLastFeedback("Khối in đang chọn không có ô dữ liệu. Hãy chọn hoặc thêm một khối in khác.");
      return false;
    }
    setPrintVariableInput(workspace, target as Blockly.BlockSvg, intent.name);
    rememberAffectedBlock(target as Blockly.BlockSvg);
    return true;
  }

  function setPrintTextInput(workspace: Blockly.WorkspaceSvg, block: Blockly.BlockSvg, text: string) {
    const slot = block.getInput("TEXT");
    if (!slot?.connection) return;
    const existing = slot.connection.targetBlock();
    if (existing) {
      slot.connection.disconnect();
      existing.dispose(true);
    }
    const textLiteral = workspace.newBlock("scc_text_literal") as Blockly.BlockSvg;
    textLiteral.initSvg();
    textLiteral.setFieldValue(text, "VALUE");
    textLiteral.render();
    if (textLiteral.outputConnection) slot.connection.connect(textLiteral.outputConnection);
  }

  function setPrintVariableInput(workspace: Blockly.WorkspaceSvg, block: Blockly.BlockSvg, name: string) {
    const slot = block.getInput("TEXT");
    if (!slot?.connection) return;
    const existing = slot.connection.targetBlock();
    if (existing) {
      slot.connection.disconnect();
      existing.dispose(true);
    }
    const variableGet = workspace.newBlock("scc_variable_get") as Blockly.BlockSvg;
    variableGet.initSvg();
    variableGet.setFieldValue(name, "NAME");
    variableGet.render();
    if (variableGet.outputConnection) slot.connection.connect(variableGet.outputConnection);
  }

  function applyAddBlockFields(workspace: Blockly.WorkspaceSvg, block: Blockly.BlockSvg, intent: Extract<VoiceIntent, { kind: "add_block" }>) {
    const fields = intent.fields;
    if (!fields) return;
    if (intent.blockType === "repeat" && fields.times !== undefined) {
      block.setFieldValue(String(fields.times), "TIMES");
    }
    if (intent.blockType === "variable") {
      if (fields.name !== undefined) block.setFieldValue(String(fields.name), "NAME");
      if (fields.value !== undefined) block.setFieldValue(String(fields.value), "VALUE");
    }
    if (intent.blockType === "print" && fields.text !== undefined) {
      setPrintTextInput(workspace, block, fields.text);
    }
    if (intent.blockType === "print" && fields.variableName !== undefined) {
      setPrintVariableInput(workspace, block, fields.variableName);
    }
  }

  function connectBlockInside(parent: Blockly.BlockSvg | null, child: Blockly.BlockSvg) {
    if (!parent || parent === child || child.getDescendants(false).includes(parent)) return false;
    const slot = parent?.getInput("DO");
    if (!slot?.connection || !child.previousConnection) return false;
    const firstChild = slot.connection.targetBlock() as Blockly.BlockSvg | null;
    if (!firstChild) {
      slot.connection.connect(child.previousConnection);
      return true;
    }
    let tail: Blockly.BlockSvg = firstChild;
    let next = tail.getNextBlock() as Blockly.BlockSvg | null;
    while (next) {
      tail = next;
      next = tail.getNextBlock() as Blockly.BlockSvg | null;
    }
    if (!tail.nextConnection) return false;
    tail.nextConnection.connect(child.previousConnection);
    return true;
  }

  function connectBlockAfter(target: Blockly.BlockSvg | null, child: Blockly.BlockSvg) {
    if (!target?.nextConnection || !child.previousConnection) return false;
    const next = target.getNextBlock() as Blockly.BlockSvg | null;
    if (next?.previousConnection) target.nextConnection.disconnect();
    target.nextConnection.connect(child.previousConnection);
    if (next?.previousConnection && child.nextConnection) child.nextConnection.connect(next.previousConnection);
    return true;
  }

  function connectBlockBefore(target: Blockly.BlockSvg | null, child: Blockly.BlockSvg) {
    if (!target?.previousConnection || !child.previousConnection || !child.nextConnection) return false;
    const previous = target.getPreviousBlock() as Blockly.BlockSvg | null;
    if (previous?.nextConnection) previous.nextConnection.disconnect();
    child.nextConnection.connect(target.previousConnection);
    if (previous?.nextConnection) previous.nextConnection.connect(child.previousConnection);
    return true;
  }

  function connectBlockAtEnd(workspace: Blockly.WorkspaceSvg, child: Blockly.BlockSvg) {
    if (!child.previousConnection) return false;
    const tops = workspace.getTopBlocks(true) as Blockly.BlockSvg[];
    const start = tops.find((b) => b.type === "scc_start") as Blockly.BlockSvg | undefined;
    if (!start) return false;
    let last: Blockly.BlockSvg = start;
    let nextBlock = last.getNextBlock() as Blockly.BlockSvg | null;
    while (nextBlock) {
      last = nextBlock;
      nextBlock = last.getNextBlock() as Blockly.BlockSvg | null;
    }
    if (!last.nextConnection) return false;
    last.nextConnection.connect(child.previousConnection);
    return true;
  }

  function connectNewBlockByCursor(workspace: Blockly.WorkspaceSvg, block: Blockly.BlockSvg, intent: Extract<VoiceIntent, { kind: "add_block" }>) {
    if (intent.blockType === "start" || !block.previousConnection) return false;
    if (intent.position?.kind === "inside") {
      const parentBlocklyType = typeMap[intent.position.parentHint];
      const parent = parentBlocklyType ? findPreferredBlockByType(workspace, parentBlocklyType) : null;
      if (!connectBlockInside(parent, block)) {
        const parentLabel = intent.position.parentHint === "repeat" ? "lặp" : intent.position.parentHint === "if" ? "điều kiện" : "cha";
        setLastFeedback(`Chưa tìm thấy khối ${parentLabel} để đưa vào trong. Hãy thêm hoặc chọn khối ${parentLabel} trước.`);
        return false;
      }
      return true;
    }
    const target = insertCursor.targetBlockId ? (workspace.getBlockById(insertCursor.targetBlockId) as Blockly.BlockSvg | null) : null;
    if (insertCursor.position === "inside") return connectBlockInside(target, block);
    if (insertCursor.position === "before") return connectBlockBefore(target, block);
    if (insertCursor.position === "after") return connectBlockAfter(target, block);
    return connectBlockAtEnd(workspace, block);
  }

  function resolveBlockFromIntentTarget(
    workspace: Blockly.WorkspaceSvg,
    target: "selected" | "display_id" | "last",
    displayId?: string,
  ) {
    if (target === "selected") return getSelectedBlock();
    if (target === "last") {
      const index = buildBlocklyVoiceCursorIndex(workspace);
      const last = index.items[index.items.length - 1];
      if (last) return workspace.getBlockById(last.blockId) as Blockly.BlockSvg | null;
      return getLastAffectedBlock(workspace);
    }
    return displayId ? getBlockByDisplayId(workspace, displayId) : null;
  }

  function deleteBlockByIntent(intent: Extract<VoiceIntent, { kind: "delete_block" | "delete_last" }>) {
    const workspace = workspaceRef.current;
    if (!workspace) return false;
    const victim =
      intent.kind === "delete_last"
        ? resolveBlockFromIntentTarget(workspace, "last")
        : resolveBlockFromIntentTarget(workspace, intent.target, intent.displayId);
    if (!victim) {
      setLastFeedback("Chưa tìm thấy khối có thể xoá. Em có thể nói: chọn khối 2, rồi xóa khối đang chọn.");
      return false;
    }
    const displayId = displayIdForBlock(victim);
    victim.dispose(true);
    lastAffectedBlockIdRef.current = null;
    setInsertCursor({ position: "end", targetBlockId: null, workspaceId: lesson.slug });
    setLastFeedback(displayId ? `Đã xoá khối ${displayId}.` : "Đã xoá khối.");
    refreshVoiceCursor();
    return true;
  }

  function moveBlockByIntent(intent: Extract<VoiceIntent, { kind: "move_block" }>) {
    const workspace = workspaceRef.current;
    if (!workspace) return false;
    const block = resolveBlockFromIntentTarget(workspace, intent.target, intent.displayId);
    if (!block || block.type === "scc_start" || !block.previousConnection) {
      setLastFeedback("Chưa tìm thấy khối có thể di chuyển.");
      return false;
    }
    if (intent.direction === "outside") {
      block.unplug(true);
      const { x, y } = getInsertPosition(workspace);
      block.moveBy(x, y);
      rememberAffectedBlock(block);
      setLastFeedback(`Đã đưa ${describeBlock(block)} ra ngoài.`);
      refreshVoiceCursor();
      return true;
    }
    if (intent.direction === "inside") {
      const parent = intent.parentDisplayId ? getBlockByDisplayId(workspace, intent.parentDisplayId) : null;
      if (!parent) {
        setLastFeedback("Chưa tìm thấy khối cha để đưa vào trong.");
        return false;
      }
      if (!parent.getInput("DO")?.connection || parent === block || block.getDescendants(false).includes(parent)) {
        setLastFeedback("Không thể đưa khối vào chính nó, khối con của nó hoặc khối không chứa lệnh.");
        return false;
      }
      block.unplug(true);
      if (!connectBlockInside(parent, block)) {
        setLastFeedback("Khối cha này chưa hỗ trợ chứa khối bên trong.");
        return false;
      }
      rememberAffectedBlock(block);
      setLastFeedback(`Đã đưa ${describeBlock(block)} vào trong ${describeBlock(parent)}.`);
      refreshVoiceCursor();
      return true;
    }
    if (intent.direction === "up") {
      const previous = block.getPreviousBlock() as Blockly.BlockSvg | null;
      if (!previous || previous.type === "scc_start") {
        setLastFeedback("Khối này đã ở vị trí cao nhất có thể.");
        return false;
      }
      block.unplug(true);
      if (!connectBlockBefore(previous, block)) return false;
      rememberAffectedBlock(block);
      setLastFeedback(`Đã di chuyển ${describeBlock(block)} lên trên.`);
      refreshVoiceCursor();
      return true;
    }
    const next = block.getNextBlock() as Blockly.BlockSvg | null;
    if (!next) {
      setLastFeedback("Khối này đã ở vị trí cuối.");
      return false;
    }
    block.unplug(true);
    if (!connectBlockAfter(next, block)) return false;
    rememberAffectedBlock(block);
    setLastFeedback(`Đã di chuyển ${describeBlock(block)} xuống dưới.`);
    refreshVoiceCursor();
    return true;
  }

  function isUndoableIntent(intent: VoiceIntent) {
    return createsProgramUndoSnapshot(intent);
  }

  function requiresConfirmation(intent: VoiceIntent) {
    return requiresVoiceConfirmation(intent);
  }

  function previewConfirmation(intent: VoiceIntent) {
    if (intent.kind === "delete_block") {
      if (intent.target === "display_id") return `Bạn muốn xóa khối ${intent.displayId}. Nói “đúng rồi” hoặc “hủy”.`;
      if (intent.target === "last") return "Bạn muốn xóa khối cuối. Nói “đúng rồi” hoặc “hủy”.";
      return "Bạn muốn xóa khối đang chọn. Nói “đúng rồi” hoặc “hủy”.";
    }
    if (intent.kind === "delete_last") return "Bạn muốn xóa khối vừa thao tác. Nói “đúng rồi” hoặc “hủy”.";
    if (intent.kind === "move_block") return `${describeIntent(intent)}. Nói “đúng rồi” hoặc “hủy”.`;
    return null;
  }

  function prepareDangerousAction(intent: VoiceIntent) {
    const workspace = workspaceRef.current;
    if (!workspace) return null;
    if (intent.kind === "delete_block" || intent.kind === "delete_last") {
      const victim =
        intent.kind === "delete_last"
          ? resolveBlockFromIntentTarget(workspace, "last")
          : resolveBlockFromIntentTarget(workspace, intent.target, intent.displayId);
      if (!victim) {
        const missing = intent.kind === "delete_block" && intent.target === "display_id" && intent.displayId
          ? `Không tìm thấy khối ${intent.displayId}.`
          : "Chưa tìm thấy khối có thể xoá.";
        setLastFeedback(`${missing} Chưa tạo thao tác xác nhận.`);
        return null;
      }
      victim.select();
      flashBlock(victim);
      return previewConfirmation(intent);
    }
    return previewConfirmation(intent);
  }

  function applyIntentToWorkspace(intent: VoiceIntent): LessonIntentApplication {
    const workspace = workspaceRef.current;
    if (!workspace || !currentStep) return { changed: false, shouldEvaluate: false };
    switch (intent.kind) {
      case "select_block": {
        refreshVoiceCursor();
        let block: Blockly.BlockSvg | null = null;
        if (intent.target === "main") {
          block = (workspace.getTopBlocks(true) as Blockly.BlockSvg[]).find((candidate) => candidate.type === "scc_start") ?? null;
        } else if (intent.target === "last") {
          block = voiceCursorItems.length
            ? (workspace.getBlockById(voiceCursorItems[voiceCursorItems.length - 1]!.blockId) as Blockly.BlockSvg | null)
            : null;
        } else if (intent.target === "block_type" && intent.blockType) {
          const matches = buildBlocklyVoiceCursorIndex(workspace).items.filter((item) => item.type === intent.blockType);
          const match = intent.ordinal === undefined ? matches[matches.length - 1] : matches[intent.ordinal - 1];
          block = match ? (workspace.getBlockById(match.blockId) as Blockly.BlockSvg | null) : null;
        } else if (intent.displayId) {
          block = getBlockByDisplayId(workspace, intent.displayId);
        }
        if (!block) {
          setLastFeedback("Chưa tìm thấy khối đó. Hãy xem ID khối rồi thử: chọn khối 1, hoặc chọn khối in thứ hai.");
          return { changed: false, shouldEvaluate: false };
        }
        block.select();
        setCursorForBlock(block, "after");
        setLastFeedback(`Đã chọn ${describeBlock(block)}.`);
        refreshVoiceCursor();
        return { applied: true, changed: false, shouldEvaluate: false };
      }
      case "set_insert_cursor": {
        if (intent.position === "end") {
          const alreadyAtEnd = insertCursor.position === "end";
          setInsertCursor({ position: "end", targetBlockId: null, workspaceId: lesson.slug });
          setLastFeedback(alreadyAtEnd ? "Vị trí chèn đã ở cuối chương trình." : "Vị trí chèn hiện tại là cuối chương trình.");
          return { applied: !alreadyAtEnd, changed: false, shouldEvaluate: false };
        }
        const target = resolveInsertCursorTarget(workspace, intent);
        if (!target) {
          if (intent.target === "display_id" && intent.displayId) {
            setLastFeedback(`Không tìm thấy khối ${intent.displayId}. Vị trí chèn hiện tại không bị thay đổi.`);
            return { changed: false, shouldEvaluate: false };
          }
          setLastFeedback("Hãy chọn một khối trước. Ví dụ: chọn khối 2.");
          return { changed: false, shouldEvaluate: false };
        }
        if (intent.position === "inside" && !target.getInput("DO")?.connection) {
          const displayId = displayIdForBlock(target) ?? intent.displayId ?? "";
          setLastFeedback(`Khối ${displayId || "này"} không hỗ trợ chèn vào trong. Em có thể chèn trước hoặc chèn sau khối này.`);
          return { changed: false, shouldEvaluate: false };
        }
        const alreadyThere = insertCursor.position === intent.position && insertCursor.targetBlockId === target.id;
        if (alreadyThere) {
          setLastFeedback(`Vị trí chèn đã ở ${cursorPositionLabel(insertCursor)}.`);
          return { applied: false, changed: false, shouldEvaluate: false };
        }
        target.select();
        setCursorForBlock(target, intent.position);
        setLastFeedback(`Đã đặt vị trí chèn ${cursorPositionLabel({
          position: intent.position,
          targetBlockId: target.id,
          targetDisplayId: displayIdForBlock(target),
          workspaceId: lesson.slug,
        })}.`);
        refreshVoiceCursor();
        return { applied: true, changed: false, shouldEvaluate: false };
      }
      case "query_position": {
        const selected = getSelectedBlock() ?? getLastAffectedBlock(workspace);
        setLastFeedback(
          selected
            ? `Em đang chọn ${describeBlock(selected)}. Vị trí chèn là ${cursorPositionLabel(insertCursor)}.`
            : `Chưa chọn khối nào. Vị trí chèn là ${cursorPositionLabel(insertCursor)}.`,
        );
        return { applied: true, changed: false, shouldEvaluate: false };
      }
      case "pan_workspace":
      case "center_workspace":
      case "zoom_workspace":
        return applyWorkspaceViewportAction(intent);
      case "set_toolbox_visibility":
        if (toolboxOpen === intent.visible) {
          setLastFeedback(intent.visible ? "Danh sách khối đã mở." : "Danh sách khối đã thu gọn.");
          return { applied: false, changed: false, shouldEvaluate: false };
        }
        setBlocklyToolboxOpen(intent.visible);
        setLastFeedback(intent.visible ? "Đã mở danh sách khối." : "Đã thu gọn danh sách khối.");
        return { applied: true, changed: false, shouldEvaluate: false };
      case "open_toolbox_category":
        return { applied: openBlocklyToolboxCategory(intent.category), changed: false, shouldEvaluate: false };
      case "close_toolbox_category": {
        if (!workspace.getToolbox()?.getSelectedItem()) {
          setLastFeedback("Chưa mở nhóm khối nào để đóng.");
          return { applied: false, changed: false, shouldEvaluate: false };
        }
        workspace.getToolbox()?.setSelectedItem(null);
        setLastFeedback("Đã đóng nhóm khối.");
        return { applied: true, changed: false, shouldEvaluate: false };
      }
      case "add_block": {
        const blocklyType = typeMap[intent.blockType];
        if (!blocklyType) {
          setLastFeedback("Khối này chưa có trong workspace. Em có thể chọn khối trong danh sách hiện có.");
          return { changed: false, shouldEvaluate: false };
        }
        const block = workspace.newBlock(blocklyType) as Blockly.BlockSvg;
        block.initSvg();
        block.render();
        applyAddBlockFields(workspace, block, intent);
        if (connectNewBlockByCursor(workspace, block, intent)) {
          rememberAffectedBlock(block);
          setLastFeedback(`Đã ${describeIntent(intent)}.`);
          refreshVoiceCursor();
          return { changed: true, shouldEvaluate: true };
        }
        if (intent.position?.kind === "inside") {
          block.dispose(true);
          return { changed: false, shouldEvaluate: false };
        }
        const { x, y } = getInsertPosition(workspace);
        block.moveBy(x, y);
        rememberAffectedBlock(block);
        setLastFeedback(`Đã ${describeIntent(intent)}.`);
        refreshVoiceCursor();
        return { changed: true, shouldEvaluate: true };
      }
      case "insert_into": {
        const parentType = intent.parentHint ?? (currentStep.action.kind === "insert_into" ? currentStep.action.parentBlockType : undefined);
        const childType = intent.childHint ?? (currentStep.action.kind === "insert_into" ? currentStep.action.childBlockType : "print");
        const parentBlocklyType = parentType ? typeMap[parentType] : undefined;
        const childBlocklyType = typeMap[childType];
        const parent = parentBlocklyType ? findPreferredBlockByType(workspace, parentBlocklyType) : null;
        const selected = getSelectedBlock();
        const candidates = childBlocklyType
          ? (workspace.getAllBlocks(false) as Blockly.BlockSvg[]).filter((block) => block !== parent && block.type === childBlocklyType && block.previousConnection)
          : [];
        const child = selected && candidates.includes(selected) ? selected : candidates[candidates.length - 1];
        const input = parent?.getInput("DO");
        if (!parent || !input?.connection) {
          const parentLabel = parentType === "repeat" ? "lặp" : parentType === "if" ? "điều kiện" : "cha";
          setLastFeedback(`Chưa tìm thấy khối ${parentLabel} để đưa vào trong. Hãy thêm hoặc chọn khối ${parentLabel} trước.`);
          return { changed: false, shouldEvaluate: false };
        }
        if (input.connection.targetBlock()) {
          setLastFeedback("Khối cha đã có khối bên trong. Hãy chọn vị trí khác nếu cần.");
          return { changed: false, shouldEvaluate: false };
        }
        if (!child?.previousConnection) {
          setLastFeedback("Chưa tìm thấy khối con để đưa vào trong. Hãy thêm hoặc chọn khối con trước.");
          return { changed: false, shouldEvaluate: false };
        }
        if (child.getDescendants(false).includes(parent)) {
          setLastFeedback("Không thể đưa khối cha vào bên trong khối con của nó.");
          return { changed: false, shouldEvaluate: false };
        }
        input.connection.connect(child.previousConnection);
        rememberAffectedBlock(child);
        setLastFeedback("Đã đưa khối vào trong.");
        return { changed: true, shouldEvaluate: true };
      }
      case "set_text":
      case "set_number": {
        const changed = setFieldFromIntent(intent);
        if (changed) setLastFeedback(`Đã ${describeIntent(intent)}.`);
        return { changed, shouldEvaluate: changed };
      }
      case "set_variable_output": {
        const changed = setVariableOutputFromIntent(intent);
        if (changed) setLastFeedback(`Đã ${describeIntent(intent)}.`);
        return { changed, shouldEvaluate: changed };
      }
      case "delete_block":
        return { changed: deleteBlockByIntent(intent), shouldEvaluate: false };
      case "delete_last": {
        return { changed: deleteBlockByIntent(intent), shouldEvaluate: false };
      }
      case "move_block":
        return { changed: moveBlockByIntent(intent), shouldEvaluate: false };
      case "run_program":
        return { applied: true, changed: false, shouldEvaluate: true };
      case "navigate_step":
        return { applied: false, changed: false, shouldEvaluate: false };
      case "ask_hint": {
        const feedback = advanceHint();
        if (!feedback) {
          setLastFeedback("Bước này chưa có gợi ý để xem. Em có thể xem lại yêu cầu hiện tại.");
          return { applied: false, changed: false, shouldEvaluate: false };
        }
        commandFeedbackRef.current = feedback;
        return { applied: true, changed: false, shouldEvaluate: currentStep.action.kind === "ask_hint" };
      }
      case "check_work": {
        const evaluation = evaluateAndMaybeAdvance(intent);
        return { applied: evaluation !== null, changed: false, evaluation, shouldEvaluate: false };
      }
      case "explain_block": {
        const selected = getSelectedBlock() ?? getLastAffectedBlock(workspace);
        setLastFeedback(selected ? `${describeBlock(selected)}. Khối này dùng để ${getBlocklyBlockVoiceLabel(selected).toLowerCase()}.` : "Hãy chọn một khối trước để mình giải thích.");
        return { applied: Boolean(selected), changed: false, shouldEvaluate: false };
      }
      case "confirm":
      case "cancel":
        return { changed: false, shouldEvaluate: false };
      case "unknown":
        setLastFeedback(unknownCommandRecovery({
          cursorLabel: cursorPositionLabel(insertCursor),
          sampleUtterance,
          selectableBlockCount: buildBlocklyVoiceCursorIndex(workspace).items.length,
        }));
        return { changed: false, shouldEvaluate: false };
      default:
        return { changed: false, shouldEvaluate: false };
    }
  }

  function executePendingAction(transcript: string): GlobalCommandExecutionResult | null {
    if (!pendingAction) return null;
    if (pendingAction.kind === "step_navigation") {
      if (pendingAction.fromStepIndex !== currentStepIndex) {
        const feedback = "Bước học đã thay đổi. Hãy yêu cầu chuyển bước lại nếu em vẫn muốn đi tiếp.";
        setPendingAction(null);
        setLastFeedback(feedback);
        return makeWorkspaceCommandResult(transcript, feedback, false, undefined, null, "not_applied");
      }
      return performStepNavigation(pendingAction.targetIndex, transcript);
    }
    const intent = pendingAction.intent;
    if (intent.kind === "navigate_step") {
      setPendingAction(null);
      return requestStepNavigation(targetStepIndex(intent), transcript, true);
    }
    commandFeedbackRef.current = null;
    suppressEvaluationRef.current = true;
    if (isUndoableIntent(intent)) {
      captureUndoSnapshot(describeIntent(intent));
    }
    const outcome = applyIntentToWorkspace(intent);
    const actionFeedback = commandFeedbackRef.current;
    persistVoiceCommandLog(transcript, intent, outcome);
    setPendingAction(null);
    window.setTimeout(() => {
      suppressEvaluationRef.current = false;
    }, 50);
    const evaluation = outcome.shouldEvaluate ? evaluateAndMaybeAdvance(intent) : outcome.evaluation ?? null;
    refreshVoiceCursor();
    return finishLessonCommand(transcript, intent, outcome, actionFeedback, evaluation);
  }

  function cancelPendingAction(transcript?: string) {
    setPendingAction(null);
    setLastFeedback("Đã hủy thao tác. Em có thể nói: chọn khối 2, chèn sau, hoặc gợi ý.");
    if (transcript) persistVoiceCommandLog(transcript, { kind: "cancel" }, { changed: false, shouldEvaluate: false });
  }

  function makeWorkspaceCommandResult(
    command: string,
    feedback: string,
    handled: boolean,
    understoodAs?: string,
    pendingPreview?: string | null,
    outcome?: GlobalCommandExecutionResult["outcome"],
  ): GlobalCommandExecutionResult {
    return { command, feedback, handled, outcome, pendingPreview, target: "workspace", understoodAs };
  }

  function finishLessonCommand(
    command: string,
    intent: VoiceIntent,
    application: LessonIntentApplication,
    actionFeedback: string | null,
    evaluation: LessonStepEvaluationResult | null,
  ): GlobalCommandExecutionResult {
    const understoodAs = describeIntent(intent);
    const result = resolveLessonCommandOutcome({
      actionFeedback,
      applied: application.applied ?? application.changed,
      evaluation,
      intentKind: intent.kind,
      understoodAs,
    });
    if (intent.kind === "ask_hint" && result.outcome === "applied") deliverHintFeedback(result.feedback, evaluation);
    else if (!evaluation?.completed) setLastFeedback(result.feedback);
    return makeWorkspaceCommandResult(command, result.feedback, result.handled, understoodAs, null, result.outcome);
  }

  function restartLesson() {
    setLessonComplete(false);
    setCurrentStepIndex(0);
    setPreviousStepResult(null);
    setStepNavigationNotice(null);
    setRunResult(null);
    setLastFeedback(null);
    setCompletionCommand("");
  }

  function handleCompletionCommand(command: string): GlobalCommandExecutionResult {
    const action = runCompletionModalCommand(command, Boolean(nextLesson), {
      next: () => router.push(nextLessonHref),
      list: () => router.push(lessonsHref),
      restart: restartLesson,
    });
    const feedback = action === "next"
      ? "Đang mở bài tiếp theo."
      : action === "list"
        ? "Đang mở danh sách bài."
        : action === "restart"
          ? "Đang làm lại bài này."
          : "Hộp thoại hoàn thành chỉ nhận: bài tiếp theo, danh sách bài, hoặc làm lại.";
    setRecognizedCommand(command);
    setLastFeedback(feedback);
    return { command, feedback, handled: action !== null, outcome: action ? "applied" : "not_applied", target: "workspace", understoodAs: action ?? undefined };
  }

  function handleTranscriptCommand(rawTranscript: string, source: VoiceCommandSource = "microphone"): GlobalCommandExecutionResult {
    if (lessonComplete) return handleCompletionCommand(rawTranscript);
    const parsed = parseVoiceCommandInput(source, rawTranscript);
    if (!parsed) return makeWorkspaceCommandResult(rawTranscript, "Hãy nhập một câu lệnh.", false, undefined, null, "not_applied");
    const { intent, transcript } = parsed;
    const understoodAs = describeIntent(intent);
    if (source === "microphone" && transcript === lastTranscriptRef.current) {
      return makeWorkspaceCommandResult(transcript, "Đã bỏ qua câu lệnh trùng.", false, understoodAs, null, "not_applied");
    }
    if (source === "microphone") lastTranscriptRef.current = transcript;
    if (advancingRef.current) {
      return makeWorkspaceCommandResult(transcript, "Bài học đang chuyển bước. Vui lòng thử lại sau giây lát.", false, understoodAs, null, "not_applied");
    }
    setRecognizedCommand(transcript);
    setVoiceLog((items) => [...items, transcript].slice(-5));
    setLastIntent(intent);
    if (pendingAction) {
      if (intent.kind === "confirm") {
        return executePendingAction(transcript)
          ?? makeWorkspaceCommandResult(transcript, "Không còn thao tác nào cần xác nhận.", false, understoodAs, null, "not_applied");
      }
      if (intent.kind === "cancel") {
        cancelPendingAction(transcript);
        return makeWorkspaceCommandResult(transcript, "Đã hủy thao tác.", true, understoodAs, null, "applied");
      }
      setLastFeedback("Em hãy nói 'đúng rồi' để thực hiện, hoặc 'hủy' để bỏ thao tác này.");
      return makeWorkspaceCommandResult(transcript, "Em hãy nói 'đúng rồi' để thực hiện, hoặc 'hủy' để bỏ thao tác này.", false, understoodAs, pendingAction.preview, "pending");
    }
    if (intent.kind !== "navigate_step") setStepNavigationNotice(null);
    if (intent.kind === "confirm") {
      setLastFeedback("Hiện không có hành động nào cần xác nhận.");
      persistVoiceCommandLog(transcript, intent, { changed: false, shouldEvaluate: false });
      return makeWorkspaceCommandResult(transcript, "Hiện không có hành động nào cần xác nhận.", false, understoodAs, null, "not_applied");
    }
    if (intent.kind === "cancel") {
      setLastFeedback("Hiện không có hành động nào cần hủy.");
      persistVoiceCommandLog(transcript, intent, { changed: false, shouldEvaluate: false });
      return makeWorkspaceCommandResult(transcript, "Hiện không có hành động nào cần hủy.", false, understoodAs, null, "not_applied");
    }
    if (intent.kind === "undo_last") {
      const changed = restoreUndoSnapshot();
      persistVoiceCommandLog(transcript, intent, { changed, shouldEvaluate: false });
      return makeWorkspaceCommandResult(transcript, changed ? "Đã hoàn tác thao tác gần nhất." : "Chưa có thao tác nào để hoàn tác.", changed, understoodAs, null, changed ? "applied" : "not_applied");
    }
    if (intent.kind === "navigate_step") {
      return requestStepNavigation(targetStepIndex(intent), transcript);
    }
    if (requiresConfirmation(intent)) {
      commandFeedbackRef.current = null;
      const preview = prepareDangerousAction(intent);
      if (preview) {
        setPendingAction({ kind: "workspace", intent, preview });
        setLastFeedback(preview);
        persistVoiceCommandLog(transcript, intent, { changed: false, shouldEvaluate: false });
        return makeWorkspaceCommandResult(transcript, preview, true, understoodAs, preview, "pending");
      }
      return makeWorkspaceCommandResult(transcript, commandFeedbackRef.current ?? "Không thể chuẩn bị thao tác này.", false, understoodAs, null, "not_applied");
    }
    commandFeedbackRef.current = null;
    suppressEvaluationRef.current = true;
    if (isUndoableIntent(intent)) {
      captureUndoSnapshot(describeIntent(intent));
    }
    const outcome = applyIntentToWorkspace(intent);
    const actionFeedback = commandFeedbackRef.current;
    persistVoiceCommandLog(transcript, intent, outcome);
    // Hold suppression briefly so any sync Blockly events from newBlock()
    // / connect() don't slip past before we run the user-driven evaluation.
    window.setTimeout(() => {
      suppressEvaluationRef.current = false;
    }, 50);
    const evaluation = outcome.shouldEvaluate ? evaluateAndMaybeAdvance(intent) : outcome.evaluation ?? null;
    refreshVoiceCursor();
    return finishLessonCommand(transcript, intent, outcome, actionFeedback, evaluation);
  }

  function formatSpeechRankingCandidates(candidates: ReturnType<typeof rankVoiceCommandAlternatives>["candidates"]) {
    return candidates
      .slice(0, 2)
      .map((candidate, index) => `${index + 1}. ${describeIntent(candidate.intent)}`)
      .join(" ");
  }

  function handleSpeechAlternatives(alternatives: readonly SpeechAlternativeInput[]): GlobalCommandExecutionResult {
    const heardTranscript = alternatives[0]?.transcript.trim() ?? "";
    if (lessonComplete) return handleCompletionCommand(heardTranscript);
    if (!heardTranscript) return makeWorkspaceCommandResult("", "Không nghe rõ câu lệnh. Hãy thử lại hoặc dùng thanh Nhập lệnh.", false, undefined, null, "unsupported");
    const ranking = rankVoiceCommandAlternatives(
      alternatives,
      createVoiceCommandRankingContext(currentStep?.action, sampleUtterance),
    );
    const best = ranking.best;
    if (!best) {
      setRecognizedCommand(heardTranscript);
      setLastIntent({ kind: "unknown", reason: "empty" });
      setLastFeedback("Không nghe rõ câu lệnh. Hãy thử lại hoặc dùng thanh Nhập lệnh.");
      return makeWorkspaceCommandResult(heardTranscript, "Không nghe rõ câu lệnh. Hãy thử lại hoặc dùng thanh Nhập lệnh.", false, "chưa hiểu câu lệnh", null, "unsupported");
    }

    if (ranking.status === "reject") {
      const feedback = `Đã nghe: “${heardTranscript}”. Mình chưa đủ chắc để thực hiện lệnh này. Em có thể nói lại chậm hơn hoặc nhập câu lệnh mẫu.`;
      setRecognizedCommand(heardTranscript);
      setLastIntent(best.intent);
      setVoiceLog((items) => [...items, heardTranscript].slice(-5));
      setLastFeedback(feedback);
      persistVoiceCommandLog(heardTranscript, best.intent, { changed: false, shouldEvaluate: false });
      return makeWorkspaceCommandResult(heardTranscript, feedback, false, describeIntent(best.intent), null, "not_applied");
    }

    if (ranking.status === "confirm") {
      const second = ranking.candidates[1];
      const closeCandidates =
        second && best.score - second.score < SPEECH_RANKING_THRESHOLDS.ambiguousDelta;
      if (closeCandidates) {
        const feedback = `Hệ thống nghe chưa chắc. Có thể là: ${formatSpeechRankingCandidates(ranking.candidates)}. Vị trí chèn chưa thay đổi; em hãy nói lại rõ hơn hoặc dùng thanh Nhập lệnh.`;
        setRecognizedCommand(heardTranscript);
        setLastIntent(best.intent);
        setVoiceLog((items) => [...items, heardTranscript].slice(-5));
        setLastFeedback(feedback);
        persistVoiceCommandLog(heardTranscript, best.intent, { changed: false, shouldEvaluate: false });
        return makeWorkspaceCommandResult(heardTranscript, feedback, false, describeIntent(best.intent), null, "not_applied");
      }
      const preview = `Hệ thống nghe chưa chắc: ${describeIntent(best.intent)}. Nói “đúng rồi” để thực hiện, hoặc “hủy” để bỏ qua.`;
      setRecognizedCommand(heardTranscript);
      setLastIntent(best.intent);
      setVoiceLog((items) => [...items, heardTranscript].slice(-5));
      setPendingAction({ kind: "workspace", intent: best.intent, preview });
      setLastFeedback(preview);
      persistVoiceCommandLog(heardTranscript, best.intent, { changed: false, shouldEvaluate: false });
      return makeWorkspaceCommandResult(heardTranscript, preview, true, describeIntent(best.intent), preview, "pending");
    }

    const result = handleTranscriptCommand(best.transcript, "microphone");
    if (best.transcript !== heardTranscript) {
      const feedback = `Đã nghe: “${heardTranscript}”. Hệ thống chọn lệnh phù hợp hơn: “${best.transcript}”. ${result.feedback}`;
      setLastFeedback(feedback);
      return { ...result, command: heardTranscript, feedback };
    }
    return result;
  }

  textCommandHandlerRef.current = (command: string) => {
    const result = handleTranscriptCommand(command, "text");
    setLastCommandResult(result);
    return result;
  };

  useEffect(() => {
    if (!currentStep) return undefined;
    return registerWorkspaceCommand({
      handleTextCommand: (command) => textCommandHandlerRef.current(command),
      id: `${lesson.slug}:${currentStep.id}`,
      lessonSlug: lesson.slug,
      lessonTitle: lesson.title,
      modalOpen: lessonComplete,
      pendingPreview: pendingAction?.preview ?? null,
      sampleUtterance,
      stepTitle: currentStep.title,
      workspaceReady,
    });
  }, [
    currentStep,
    lesson.slug,
    lesson.title,
    lessonComplete,
    pendingAction?.preview,
    registerWorkspaceCommand,
    sampleUtterance,
    workspaceReady,
  ]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    Blockly.svgResize(workspace);
    const id = window.setTimeout(() => Blockly.svgResize(workspace), 0);
    return () => window.clearTimeout(id);
  }, [commandBarHeight]);

  // Inject Blockly ONCE on mount. Don't dispose on step change — only clear
  // and reload the starter via the next effect. Disposing per step caused
  // bursts of CREATE/MOVE events to fire on a stale closure listener.
  useEffect(() => {
    ensureBlocks();
    if (!containerRef.current || workspaceRef.current) return;
    try {
      setWorkspaceError(null);
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
    } catch (error) {
      setWorkspaceReady(false);
      setWorkspaceError(error instanceof Error ? error.message : "Blockly khởi tạo thất bại.");
    }
    return () => {
      workspaceRef.current?.dispose();
      workspaceRef.current = null;
      workspaceStarterSignatureRef.current = null;
      setWorkspaceReady(false);
    };
  }, [workspaceRetryKey]);

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
    const hasBlocks = workspace.getAllBlocks(false).length > 0;
    prevStepIndexRef.current = currentStepIndex;
    // Adjacent forward advance: don't touch the workspace.
    if (!willReplaceWorkspace(prevIndex, currentStepIndex, hasBlocks)) {
      return;
    }
    // Backward, jump, or first load: reset to this step's starter.
    suppressEvaluationRef.current = true;
    workspace.clear();
    Blockly.serialization.workspaces.load(starterStateFromWorkspace(currentStep.starterWorkspace), workspace);
    workspaceStarterSignatureRef.current = workspaceContentSignature(
      Blockly.serialization.workspaces.save(workspace) as Record<string, unknown>,
    );
    window.setTimeout(refreshVoiceCursor, 0);
    const id = window.setTimeout(() => {
      suppressEvaluationRef.current = false;
    }, 50);
    return () => window.clearTimeout(id);
    // This load effect intentionally uses the current closure snapshot; the
    // same stale-step guards as the Blockly listener protect event bursts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      refreshVoiceCursor();
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
    // This listener intentionally captures the current step snapshot; refs
    // above guard against stale step changes during Blockly load bursts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, currentStepIndex]);

  useEffect(() => {
    if (!speech.finalResultId) return;
    const result = handleSpeechAlternatives(speech.alternatives.length ? speech.alternatives : [{ transcript: speech.transcript }]);
    setLastCommandResult(result);
    // Transcript handling intentionally uses the same closure pattern as the
    // Blockly listener to avoid reprocessing while a step is advancing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.finalResultId]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    updateBlocklyVoiceBadges(workspace, voiceCursorItems, selectedBlockForDisplay(workspace)?.id ?? null, insertCursor.targetBlockId);
  }, [insertCursor, voiceCursorItems]);

  useEffect(() => {
    if (!accessibilitySettings?.audioInstructions || !currentStep || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(stripInstructionText(currentStep.instructions));
    utterance.lang = "vi-VN";
    window.speechSynthesis.speak(utterance);
    return () => window.speechSynthesis.cancel();
  }, [accessibilitySettings?.audioInstructions, currentStep]);

  useEffect(() => {
    if (!accessibilitySettings?.audioInstructions || !lastFeedback || typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(lastFeedback);
    utterance.lang = "vi-VN";
    window.speechSynthesis.speak(utterance);
  }, [accessibilitySettings?.audioInstructions, lastFeedback]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace || typeof document === "undefined") return;
    workspace.getToolbox()?.setVisible(toolboxOpen);
    if (!toolboxOpen) workspace.getToolbox()?.setSelectedItem(null);
    const root = workspace.getInjectionDiv();
    const elements = Array.from(
      root?.querySelectorAll<HTMLElement>(".blocklyToolboxDiv, .blocklyFlyout") ?? [],
    );
    elements.forEach((element) => {
      element.style.display = toolboxOpen ? "" : "none";
      element.style.visibility = toolboxOpen ? "" : "hidden";
      if (toolboxOpen) {
        element.removeAttribute("aria-hidden");
      } else {
        element.setAttribute("aria-hidden", "true");
      }
    });
    Blockly.svgResize(workspace);
    window.setTimeout(() => Blockly.svgResize(workspace), 0);
  }, [toolboxOpen]);

  useEffect(() => {
    if (!lessonComplete || typeof document === "undefined") return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = containerRef.current;
    const hiddenBlocklyElements = Array.from(
      root?.querySelectorAll<HTMLElement>(".blocklyToolboxDiv, .blocklyFlyout, .blocklyScrollbarHorizontal, .blocklyScrollbarVertical") ?? [],
    ).map((element) => ({
      ariaHidden: element.getAttribute("aria-hidden"),
      element,
      pointerEvents: element.style.pointerEvents,
      visibility: element.style.visibility,
    }));
    hiddenBlocklyElements.forEach(({ element }) => {
      element.setAttribute("aria-hidden", "true");
      element.style.visibility = "hidden";
      element.style.pointerEvents = "none";
    });
    window.setTimeout(() => completionModalRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const modal = completionModalRef.current;
      if (!modal) return;
      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) {
        event.preventDefault();
        modal.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      hiddenBlocklyElements.forEach(({ ariaHidden, element, pointerEvents, visibility }) => {
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
        element.style.pointerEvents = pointerEvents;
        element.style.visibility = visibility;
      });
      previousFocusRef.current?.focus();
      const workspace = workspaceRef.current;
      if (workspace) Blockly.svgResize(workspace);
    };
  }, [lessonComplete]);

  if (!currentStep) {
    return (
      <section className="rounded-[1.4rem] border-4 border-black bg-[#fffdf3] p-6 shadow-[8px_8px_0_#121212]">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-black">Bài học chưa sẵn sàng</p>
        <p className="mt-3 text-base text-black">Không tìm thấy bước hiện tại để hiển thị workspace.</p>
      </section>
    );
  }

  const activeHint = currentStep.hints[hintIndex % Math.max(currentStep.hints.length, 1)];
  const voicePresentation = lessonVoicePresentation({
    asrState: speech.asrState,
    errorMessage: speech.errorMessage,
    isSupportKnown: speech.isSupportKnown,
    isSupported: speech.isSupported,
    outcome: pendingAction ? "pending" : lastCommandResult?.outcome,
    privacyAcknowledged: voicePrivacyAcknowledged,
  });
  const voiceToneClass = {
    active: "bg-[#7df2c3]",
    ready: "bg-white",
    success: "bg-[#c8f5d8]",
    warning: "bg-[#fff0a8]",
    working: "bg-[#a8e6ff]",
  }[voicePresentation.tone];
  const visiblePreviousStepResult = previousStepResult?.toStepIndex === currentStepIndex ? previousStepResult : null;
  const visibleStepNavigationNotice = stepNavigationNotice?.targetIndex === currentStepIndex ? stepNavigationNotice : null;
  const fontSize = accessibilitySettings?.fontScale === "x-large" ? "1.2rem" : accessibilitySettings?.fontScale === "large" ? "1.1rem" : "1rem";
  const accessibilityClass = [
    accessibilitySettings?.highContrast ? "scc-high-contrast" : "",
    accessibilitySettings?.largeTouchTargets ? "scc-large-targets" : "",
    accessibilitySettings?.reducedMotion ? "scc-reduced-motion" : "",
    toolboxOpen ? "" : "scc-toolbox-collapsed",
  ].filter(Boolean).join(" ");

  const completionModal = lessonComplete && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={completionModalRef}
          aria-labelledby="lesson-complete-title"
          aria-modal="true"
          className="fixed inset-0 flex min-w-0 items-center justify-center bg-black/45 p-2 backdrop-blur-sm sm:p-4"
          role="dialog"
          style={{ zIndex: "var(--z-completion-modal)" }}
          tabIndex={-1}
        >
          <div className="max-h-[calc(100dvh-1rem)] min-w-0 w-full max-w-lg overflow-y-auto overscroll-contain rounded-[1.4rem] border-4 border-black bg-[#fff6fb] p-3 shadow-[10px_10px_0_#121212] sm:max-h-[calc(100dvh-2rem)] sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-black">Hoàn thành</p>
            <h2 id="lesson-complete-title" className="font-heading mt-2 break-words text-2xl text-black sm:text-3xl">Xong bài &quot;{lesson.title}&quot;!</h2>
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
                  href={nextLessonHref}
                  className="inline-flex min-h-10 min-w-0 max-w-full items-center break-words rounded-[0.75rem] border-4 border-black bg-[#a8e6ff] px-4 py-2 text-sm font-black uppercase text-black shadow-[4px_4px_0_#121212] transition hover:-translate-y-0.5"
                >
                  Bài tiếp theo: {nextLesson.title} →
                </Link>
              ) : (
                <Link
                  href={lessonsHref}
                  className="inline-flex min-h-10 min-w-0 max-w-full items-center break-words rounded-[0.75rem] border-4 border-black bg-[#a8e6ff] px-4 py-2 text-sm font-black uppercase text-black shadow-[4px_4px_0_#121212] transition hover:-translate-y-0.5"
                >
                  Đã xong toàn bộ - Về danh sách
                </Link>
              )}
              <Link
                href={lessonsHref}
                className="inline-flex min-h-10 items-center rounded-[0.75rem] border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase text-black shadow-[4px_4px_0_#121212] transition hover:-translate-y-0.5"
              >
                Danh sách bài
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={restartLesson}
              >
                Làm lại
              </Button>
            </div>
            <form
              className="mt-4 flex min-w-0 flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const result = textCommandHandlerRef.current(completionCommand);
                if (result.handled) setCompletionCommand("");
              }}
            >
              <label className="min-w-0 basis-full flex-1 text-sm font-semibold text-black sm:basis-[180px]" htmlFor="completion-command">
                Nhập lệnh hoàn thành
                <input
                  className="mt-1 min-h-10 w-full rounded border-2 border-black bg-white px-3 py-2 text-black"
                  id="completion-command"
                  onChange={(event) => setCompletionCommand(event.target.value)}
                  value={completionCommand}
                />
              </label>
              <Button size="sm" type="submit">Thực hiện</Button>
              <Button
                aria-label={speech.isListening ? "Dừng nghe lệnh hoàn thành" : "Nói lệnh hoàn thành"}
                disabled={!canStartVoiceRecognition(speech.isSupportKnown, speech.isSupported, voicePrivacyAcknowledged)}
                onClick={() => {
                  if (speech.isListening) void speech.stopListening();
                  else void speech.startListening();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {speech.isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                {speech.isListening ? "Dừng" : "Nói"}
              </Button>
            </form>
            {!voicePrivacyAcknowledged && (
              <div className="mt-3 rounded border-2 border-black bg-[#fff6a8] p-3 text-xs text-black">
                <p>Giọng nói có thể được xử lý qua Groq, máy chủ SAYNTAX hoặc dịch vụ trình duyệt. SAYNTAX không giữ âm thanh thô; lưu câu lệnh mặc định tắt.</p>
                <details className="mt-1">
                  <summary className="min-h-11 cursor-pointer py-2 font-semibold underline underline-offset-2 focus-visible:outline-4 focus-visible:outline-[#0052cc]">Xem thông tin đầy đủ về giọng nói</summary>
                  <p className="mt-1">{VOICE_PROCESSING_DISCLOSURE}</p>
                </details>
                <Button
                  className="mt-2"
                  onClick={() => {
                    acknowledgeVoiceProcessing(window.localStorage);
                    setVoicePrivacyAcknowledged(true);
                  }}
                  size="sm"
                  type="button"
                >
                  Đồng ý, bật giọng nói
                </Button>
              </div>
            )}
            <p className="mt-2 text-xs text-zinc-700">Có thể nói hoặc nhập: bài tiếp theo, danh sách bài, làm lại.</p>
            {(lastFeedback || speech.errorMessage) && (
              <p className="mt-2 text-sm text-black">{speech.errorMessage ?? lastFeedback}</p>
            )}
            <p aria-atomic="true" className="sr-only" role="status"><span key={announcement.id}>{announcement.text}</span></p>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <section
      className={`relative grid min-h-0 min-w-0 gap-3 lg:h-full lg:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)] ${accessibilityClass}`}
      style={{ fontSize }}
    >
      <style>{`
        .scc-voice-badge { pointer-events: none; }
        .scc-voice-badge rect { fill: #121212; stroke: #ffffff; stroke-width: 2px; }
        .scc-voice-badge text { fill: #ffffff; font: 700 12px system-ui, sans-serif; pointer-events: none; }
        .scc-voice-selected .blocklyPath { stroke: #0052cc !important; stroke-width: 6px !important; filter: drop-shadow(0 0 0.2rem #ffffff) drop-shadow(0 0 0.2rem #0052cc); }
        .scc-voice-cursor .blocklyPath { filter: drop-shadow(0 0 0.35rem #ff5f87); }
        .scc-high-contrast .blocklyMainBackground { fill: #ffffff !important; }
        .scc-high-contrast, .scc-high-contrast * { color-scheme: light; }
        .scc-high-contrast .scc-voice-badge rect { fill: #000000; stroke: #ffff00; }
        .scc-large-targets button { min-height: 48px; }
        .scc-reduced-motion *, .scc-reduced-motion *::before, .scc-reduced-motion *::after { transition: none !important; animation: none !important; }
      `}</style>
      {completionModal}
      {!lessonComplete && <p aria-atomic="true" className="sr-only" role="status"><span key={announcement.id}>{announcement.text}</span></p>}
      <div className="flex min-h-0 min-w-0 flex-col rounded-[1.4rem] border-4 border-black bg-white shadow-[8px_8px_0_#121212]">
        <div className="border-b-4 border-black px-3 py-3 sm:px-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black">
            Bước {currentStepIndex + 1} / {lesson.steps.length}
            {isChallenge && (
              <span className="ml-2 inline-flex items-center rounded border-2 border-black bg-[#ffb84d] px-1.5 py-0 text-[9px] font-black uppercase text-black">
                Thử thách
              </span>
            )}
          </p>
          <h2 className="mt-1 text-[1.15em] font-bold leading-snug text-black">{currentStep.title}</h2>
          <p className="mt-1 text-[0.95em] leading-relaxed text-zinc-800">
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
            <p className="mt-2 break-words text-[0.9em] text-zinc-800">Em có thể nói: <strong className="font-mono text-black">“{sampleUtterance}”</strong></p>
          )}
          <div className="scc-lesson-voice-strip mt-3 flex min-w-0 flex-wrap items-center gap-2 rounded-xl border-2 border-black bg-[#fffdf3] p-2">
            <Button
              aria-describedby={voicePrivacyAcknowledged ? "lesson-voice-status" : "lesson-voice-status lesson-voice-privacy"}
              aria-label={speech.isListening ? "Dừng nghe lệnh bài học" : "Bắt đầu nói lệnh bài học"}
              aria-pressed={speech.asrState === "listening"}
              className="min-h-12 text-[0.9em]"
              disabled={!canStartVoiceRecognition(speech.isSupportKnown, speech.isSupported, voicePrivacyAcknowledged)}
              onClick={() => {
                if (speech.isListening) void speech.stopListening();
                else void speech.startListening();
              }}
              size="sm"
              type="button"
            >
              {speech.isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {speech.isListening ? "Dừng nghe" : "Bắt đầu nói"}
            </Button>
            <span id="lesson-voice-status" className={`min-w-0 break-words rounded border-2 border-black px-2 py-1 text-[0.85em] font-bold text-black ${voiceToneClass}`}>
              {voicePresentation.label}
            </span>
            {speech.isSupportKnown && (!speech.isSupported || speech.errorMessage) && (
              <Button disabled={speech.isListening} onClick={() => void speech.retryASR()} size="sm" type="button" variant="outline">
                Thử lại giọng nói
              </Button>
            )}
            <button
              className="min-h-10 text-left text-[0.85em] font-semibold text-black underline decoration-2 underline-offset-4"
              onClick={() => window.dispatchEvent(new Event("scc:focus-command-bar"))}
              type="button"
            >
              Nhập thay vì nói
            </button>
          </div>
          {!voicePrivacyAcknowledged && (
            <div className="mt-2 rounded-lg border-2 border-black bg-[#fff6a8] p-2 text-[0.8em] text-black" id="lesson-voice-privacy">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 basis-full flex-1 sm:basis-0">Giọng nói có thể được xử lý qua Groq, máy chủ SAYNTAX hoặc dịch vụ trình duyệt. SAYNTAX không giữ âm thanh thô; lưu câu lệnh mặc định tắt.</p>
                <Button
                  className="text-[0.85em]"
                  onClick={() => {
                    acknowledgeVoiceProcessing(window.localStorage);
                    setVoicePrivacyAcknowledged(true);
                  }}
                  size="sm"
                  type="button"
                >
                  Đồng ý, bật giọng nói
                </Button>
              </div>
              <details className="mt-1">
                <summary className="min-h-11 cursor-pointer py-2 font-semibold underline underline-offset-2 focus-visible:outline-4 focus-visible:outline-[#0052cc]">Xem thông tin đầy đủ về giọng nói</summary>
                <p className="mt-1">{VOICE_PROCESSING_DISCLOSURE}</p>
              </details>
            </div>
          )}
          <p className="mt-2 break-words rounded border-l-4 border-[#0052cc] bg-[#eef5ff] px-2 py-1 text-[0.85em] text-black">
            <strong>Khối đang chọn:</strong> {selectedBlockSummary ?? "Chưa chọn khối. Có thể nói “chọn khối 1”."}
          </p>
        </div>
        <div className="relative min-h-[320px] w-full flex-1 border-b-4 border-black">
          <div ref={containerRef} className="h-full min-h-[320px] w-full" />
          {!workspaceReady && !workspaceError && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm font-black text-black">
              Đang tải workspace...
            </div>
          )}
          {workspaceError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#fff6fb] p-4 text-center">
              <p className="font-black text-red-700">Blockly khởi tạo thất bại.</p>
              <p className="max-w-md text-sm text-zinc-700">{workspaceError}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setWorkspaceError(null);
                  setWorkspaceRetryKey((key) => key + 1);
                }}
              >
                Thử lại
              </Button>
            </div>
          )}
        </div>
        <div className="relative z-[var(--z-app-controls)] flex flex-wrap items-center gap-2 border-b-4 border-black bg-white px-3 py-2">
          <Button
            aria-label={toolboxOpen ? "Thu gọn danh sách khối" : "Mở danh sách khối"}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => setBlocklyToolboxOpen(!toolboxOpen)}
          >
            {toolboxOpen ? <PanelLeftClose className="mr-2 h-4 w-4" /> : <PanelLeftOpen className="mr-2 h-4 w-4" />}
            {toolboxOpen ? "Thu gọn" : "Mở danh sách khối"}
          </Button>
          <label className="min-w-[180px] text-[10px] font-black uppercase tracking-[0.12em] text-black">
            Micro
            <select
              aria-label="Chọn micro để kiểm tra nhận giọng nói"
              className="mt-1 block min-h-9 w-full rounded border-2 border-black bg-white px-2 py-1 text-xs font-semibold normal-case tracking-normal text-black focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ff5f87]"
              disabled={speech.isListening || speech.isStarting}
              onChange={(event) => speech.selectMicrophone(event.target.value)}
              onFocus={() => {
                void speech.refreshMicrophones();
              }}
              value={speech.selectedMicrophoneId}
            >
              <option value="">Micro mặc định</option>
              {speech.audioInputs.map((input) => (
                <option key={input.deviceId || input.label} value={input.deviceId}>
                  {input.label}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" variant="outline" onClick={runProgramFromButton}>
            <Play className="mr-2 h-4 w-4" />
            Chạy
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={restoreUndoSnapshot}
            disabled={!undoSnapshot}
          >
            Hoàn tác
          </Button>
          <div
            aria-label="Điều hướng workspace"
            className="flex flex-wrap items-center gap-1 rounded border-2 border-black bg-[#fffdf3] p-1"
            role="group"
          >
            <Button
              aria-label="Cuộn workspace lên"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => applyWorkspaceViewportAction({ kind: "pan_workspace", direction: "up" })}
            >
              Lên
            </Button>
            <Button
              aria-label="Cuộn workspace xuống"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => applyWorkspaceViewportAction({ kind: "pan_workspace", direction: "down" })}
            >
              Xuống
            </Button>
            <Button
              aria-label="Cuộn workspace sang trái"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => applyWorkspaceViewportAction({ kind: "pan_workspace", direction: "left" })}
            >
              Trái
            </Button>
            <Button
              aria-label="Cuộn workspace sang phải"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => applyWorkspaceViewportAction({ kind: "pan_workspace", direction: "right" })}
            >
              Phải
            </Button>
            <Button
              aria-label="Đưa chương trình về giữa workspace"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => applyWorkspaceViewportAction({ kind: "center_workspace", target: "workspace" })}
            >
              Về giữa
            </Button>
            <Button
              aria-label="Hiển thị toàn bộ chương trình vừa màn hình"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => applyWorkspaceViewportAction({ kind: "zoom_workspace", level: "fit" })}
            >
              Vừa màn hình
            </Button>
            <Button
              aria-label="Phóng to workspace"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => applyWorkspaceViewportAction({ kind: "zoom_workspace", level: "in" })}
            >
              Phóng to
            </Button>
            <Button
              aria-label="Thu nhỏ workspace"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => applyWorkspaceViewportAction({ kind: "zoom_workspace", level: "out" })}
            >
              Thu nhỏ
            </Button>
            <Button
              aria-label="Đặt lại zoom workspace"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => applyWorkspaceViewportAction({ kind: "zoom_workspace", level: "reset" })}
            >
              Reset zoom
            </Button>
          </div>
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
          <span className="text-xs text-zinc-600">Có thể nói hoặc nhập: “bước trước”, “bước sau”, “đến bước 3”.</span>
          {showSkip && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (nextStep().outcome === "applied") {
                  setFailCount(0);
                  setShowSkip(false);
                }
              }}
            >
              Bỏ qua
            </Button>
          )}
          {speech.transcript && (
            <span className="min-w-0 max-w-full break-all font-mono text-xs text-zinc-700 sm:ml-auto sm:max-w-[45%]">“{speech.transcript}”</span>
          )}
          {voicePrivacyAcknowledged && (
            <Button
              aria-pressed={voiceLoggingEnabled}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                setVoiceLoggingEnabled((enabled) => !enabled);
              }}
            >
              {voiceLoggingEnabled ? "Tắt lưu câu lệnh" : "Bật lưu câu lệnh nói/nhập (tùy chọn)"}
            </Button>
          )}
          {isDemoMode && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!window.confirm("Đặt lại toàn bộ tiến độ demo trên thiết bị này?")) return;
                resetDemoProgressInStorage(window.localStorage);
                setCurrentStepIndex(0);
                setLessonComplete(false);
                setPreviousStepResult(null);
                setStepNavigationNotice(null);
                setRunResult(null);
                setLastFeedback("Đã đặt lại bản demo.");
              }}
            >
              Đặt lại bản demo
            </Button>
          )}
        </div>
        <div aria-label="Phản hồi và kết quả bài học" className="scc-voice-debug-panel flex min-h-[60px] min-w-0 max-w-full flex-col gap-1 overflow-y-auto px-3 py-1.5 text-xs" role="region" tabIndex={0}>
          {isDemoMode && (
            <p className="rounded border-2 border-black bg-[#e7fff3] px-2 py-1 font-semibold text-black">
              Chế độ demo — tiến độ chỉ được lưu trên thiết bị này.
            </p>
          )}
          {visibleStepNavigationNotice && (
            <p className="min-w-0 break-words rounded border-2 border-black bg-[#e7f5ff] px-2 py-1 font-semibold text-black">
              {visibleStepNavigationNotice.feedback}
            </p>
          )}
          {visiblePreviousStepResult && (
            <div className="min-w-0 rounded border-2 border-zinc-400 bg-zinc-50 px-2 py-1 text-zinc-700">
              <p className="font-bold">Vừa hoàn thành bước {visiblePreviousStepResult.fromStepIndex + 1}: {visiblePreviousStepResult.stepTitle}</p>
              <p className="break-words">{visiblePreviousStepResult.feedback}</p>
              {visiblePreviousStepResult.runResult && (
                <div className="mt-1 font-mono">
                  <p className="font-bold">Đầu ra của bước vừa xong</p>
                  {visiblePreviousStepResult.runResult.success ? (
                    visiblePreviousStepResult.runResult.output.length > 0 ? (
                      <ul className="list-none">
                        {visiblePreviousStepResult.runResult.output.map((line, i) => <li key={i} className="break-words">{line}</li>)}
                      </ul>
                    ) : <p>(không có đầu ra)</p>
                  ) : (
                    <ul className="list-none text-red-700">
                      {visiblePreviousStepResult.runResult.errors.map((error, i) => <li key={i} className="break-words">{error}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
          {!speech.isSupportKnown && (
            <p className="text-zinc-500">
              Đang kết nối nhận dạng giọng nói...
            </p>
          )}
          <p className="min-w-0 break-words text-zinc-600">
            Đang dùng: <span className="font-semibold text-black">{speech.engineLabel}</span>
          </p>
          {speech.isSupportKnown && !speech.isSupported && (
            <p className="text-red-600">
              Trình duyệt này chưa hỗ trợ nhận dạng giọng nói và dịch vụ nhận dạng đang không khả dụng. Em vẫn có thể dùng thanh “Nhập lệnh” ở cuối màn hình.
            </p>
          )}
          {speech.errorMessage && <p className="text-red-600">{speech.errorMessage}</p>}
          {speech.isSupportKnown && speech.isSupported && !speech.isListening && !speech.errorMessage && (
            <p className="text-zinc-500">Đã dừng nghe. Em có thể bấm “Bắt đầu nói” hoặc nhập câu lệnh.</p>
          )}
          {speech.isStarting && <p className="text-zinc-500">Micro đang khởi tạo...</p>}
          {speech.asrState === "processing" && <p className="text-zinc-500">Đang xử lý giọng nói...</p>}
          {speech.microphoneStatus === "checking" && <p className="text-zinc-500">Đang kiểm tra quyền micro...</p>}
          {speech.microphoneStatus === "ready" && !speech.errorMessage && (
            <p className="text-zinc-500">
              Micro đã sẵn sàng trong trình duyệt
              {speech.selectedMicrophoneId ? " với thiết bị đã chọn. Web Speech vẫn có thể dùng input mặc định của hệ thống." : "."}
            </p>
          )}
          {speech.isListening && speech.interimTranscript && (
            <p className="min-w-0 break-words text-zinc-500">
              Đang nghe: <span className="font-mono break-words">“{speech.interimTranscript}”</span>
            </p>
          )}
          {speech.isListening && !speech.interimTranscript && (
            <p className="text-zinc-500">Đang nghe...</p>
          )}
          {recognizedCommand && (
            <p className="min-w-0 break-words text-zinc-600">
              Hệ thống đã nhận: <span className="font-mono break-words">“{recognizedCommand}”</span>
            </p>
          )}
          {speech.transcript && (
            <p className="min-w-0 break-words text-zinc-600">
              Đã nghe: <span className="font-mono break-words">“{speech.transcript}”</span>
            </p>
          )}
          {lastIntent && (
            <p className="min-w-0 break-words text-zinc-600">
              <span className="font-black uppercase tracking-[0.14em] text-[9px] text-zinc-500">
                Mình hiểu là
              </span>{" "}
              <span className="font-semibold text-black">{describeIntent(lastIntent)}</span>
            </p>
          )}
          {pendingAction && (
            <div className="min-w-0 rounded border-2 border-black bg-[#fff6a8] px-2 py-1 font-semibold text-black">
              <p className="break-words">{pendingAction.preview}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  type="button"
                  variant="secondary"
                  onClick={() => executePendingAction("xác nhận bằng nút")}
                >
                  Xác nhận
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => cancelPendingAction("hủy bằng nút")}
                >
                  Hủy
                </Button>
              </div>
            </div>
          )}
          <p className="min-w-0 break-words text-zinc-600">
            Vị trí chèn: <span className="font-semibold text-black">{cursorPositionLabel(insertCursor)}</span>
          </p>
          {lastFeedback && <p className="min-w-0 break-words font-semibold text-black">{lastFeedback}</p>}
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
            <p className="min-w-0 break-words text-zinc-500">Đã nói: {voiceLog.slice(-3).join(" · ")}</p>
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
                  aria-current={i === currentStepIndex ? "step" : undefined}
                  onClick={() => requestStepNavigation(i, "sidebar")}
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
              onClick={requestHintFromButton}
              disabled={currentStep.hints.length === 0}
            >
              Đổi
            </Button>
          </div>
          <p className="text-xs text-zinc-800">{activeHint ?? "Chưa có gợi ý cho bước này."}</p>
        </div>
        <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-[1.4rem] border-4 border-black bg-white px-3 py-2 shadow-[8px_8px_0_#121212]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black">ID khối</p>
          {voiceCursorItems.length === 0 ? (
            <p className="text-xs text-zinc-600">Chưa có khối nào trong workspace.</p>
          ) : (
            voiceCursorItems.map((item) => (
              <p key={item.blockId} className="text-xs text-zinc-800">
                <span className="font-mono font-black text-black">[{item.displayId}]</span> {item.label}
              </p>
            ))
          )}
        </div>
      </aside>
    </section>
  );
}
