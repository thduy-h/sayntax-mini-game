"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import * as Blockly from "blockly";
import { executeProgram } from "@shecancode/block-engine";
import type { LessonV2WithSteps } from "@shecancode/lesson-engine";
import { parseVoiceIntent, type VoiceIntent } from "@shecancode/voice-parser";
import type {
  ProgramExecutionResult,
  ProgramWorkspace,
  WorkspaceBlock,
} from "@shecancode/shared-types";
import { Mic, MicOff, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/features/voice-control/hooks/use-speech-recognition";
import {
  evaluateStepAction,
  type LessonStepAction,
} from "../../../../../packages/lesson-engine/src/action-model";

interface VoiceLessonClientProps {
  lesson: LessonV2WithSteps;
}

let registered = false;

const SUCCESS_EXECUTION: ProgramExecutionResult = { success: true, output: [], errors: [], variables: {} };
const typeMap = { start: "scc_start", print: "scc_print", repeat: "scc_repeat", if: "scc_if", variable: "scc_variable" } as const;
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
    { kind: "category", name: "Biến", categorystyle: "variable_category", contents: [{ kind: "block", type: "scc_variable" }] },
  ],
};

function ensureBlocks() {
  if (registered) return;
  Blockly.defineBlocksWithJsonArray([
    { type: "scc_start", message0: "bắt đầu", nextStatement: null, style: "logic_blocks" },
    { type: "scc_print", message0: "in %1", args0: [{ type: "field_input", name: "TEXT", text: "Xin chào" }], previousStatement: null, nextStatement: null, style: "text_blocks" },
    { type: "scc_repeat", message0: "lặp %1 lần", args0: [{ type: "field_number", name: "TIMES", value: 3, min: 0, precision: 1 }], message1: "thực hiện %1", args1: [{ type: "input_statement", name: "DO" }], previousStatement: null, nextStatement: null, style: "loop_blocks" },
    { type: "scc_if", message0: "nếu điều kiện là %1", args0: [{ type: "field_checkbox", name: "CONDITION", checked: true }], message1: "thì %1", args1: [{ type: "input_statement", name: "DO" }], previousStatement: null, nextStatement: null, style: "logic_blocks" },
    { type: "scc_variable", message0: "đặt biến %1 thành %2", args0: [{ type: "field_input", name: "NAME", text: "score" }, { type: "field_input", name: "VALUE", text: "5" }], previousStatement: null, nextStatement: null, style: "variable_blocks" },
  ]);
  registered = true;
}

function parseBlock(block: Blockly.Block): WorkspaceBlock {
  if (block.type === "scc_start") return { id: block.id, type: "start" };
  if (block.type === "scc_print") return { id: block.id, type: "print", fields: { text: block.getFieldValue("TEXT") || "" } };
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
  return { version: 1, blocks: workspace.getTopBlocks(true).flatMap((block) => readChain(block)) };
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
  const result: Record<string, unknown> = { id: block.id, type: typeMap[block.type] ?? block.type };
  if (x !== undefined) result.x = x;
  if (y !== undefined) result.y = y;
  const fields: Record<string, unknown> = {};
  if (block.type === "print" && block.fields?.text !== undefined) fields.TEXT = String(block.fields.text);
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
  const blocklyBlocks: Record<string, unknown>[] = [];
  let yPos = 40;
  for (const block of workspace.blocks) {
    blocklyBlocks.push(domainBlockToBlockly(block, 48, yPos));
    yPos += 110;
  }
  return { blocks: { languageVersion: 0, blocks: blocklyBlocks } };
}

function getInsertPosition(workspace: Blockly.WorkspaceSvg) {
  const roots = workspace.getTopBlocks(true);
  if (!roots.length) return { x: 48, y: 40 };
  const last = roots[roots.length - 1].getRelativeToSurfaceXY();
  return { x: last.x, y: last.y + 110 };
}

function feedbackReason(reason: Extract<VoiceIntent, { kind: "unknown" }>["reason"]) {
  return { empty: "im lặng", no_match: "rõ hơn", ambiguous: "rõ hơn", partial_add_block: "thêm khối gì" }[reason];
}

function getActionFieldName(action: LessonStepAction) {
  if (action.kind !== "set_text" && action.kind !== "set_number") return undefined;
  return fieldMap[action.field as keyof typeof fieldMap] ?? action.field.toUpperCase();
}

export function VoiceLessonClient({ lesson }: VoiceLessonClientProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const suppressEvaluationRef = useRef(false);
  const stepIndexRef = useRef(0);
  const advancingRef = useRef(false);
  const lastTranscriptRef = useRef("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [voiceLog, setVoiceLog] = useState<string[]>([]);
  const [showSkip, setShowSkip] = useState(false);
  const speech = useSpeechRecognition();
  const currentStep = lesson.steps[currentStepIndex];

  useEffect(() => {
    stepIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);

  useEffect(() => {
    setCurrentStepIndex(0);
  }, [lesson.id]);

  useEffect(() => {
    setFailCount(0);
    setLastFeedback(null);
    setShowSkip(false);
    setHintIndex(0);
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

  function resolveTargetBlock(workspace: Blockly.WorkspaceSvg, action: LessonStepAction) {
    if ((action.kind === "set_text" || action.kind === "set_number") && action.blockId) {
      return workspace.getBlockById(action.blockId);
    }
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
    const evaluation = evaluateStepAction(currentStep.action, program, exec);
    setLastFeedback(evaluation.feedback);
    if (evaluation.completed) {
      resetAfterSuccess(currentStepIndex < lesson.steps.length - 1);
      return;
    }
    setFailCount((count) => count + 1);
  }

  function setFieldFromIntent(intent: Extract<VoiceIntent, { kind: "set_text" | "set_number" }>) {
    const workspace = workspaceRef.current;
    if (!workspace || !currentStep) return false;
    const target = resolveTargetBlock(workspace, currentStep.action);
    if (!target) {
      setLastFeedback(intent.kind === "set_text" ? "Hãy chọn khối trước khi đặt chữ." : "Hãy chọn khối trước khi đặt số.");
      return false;
    }
    const fieldName = resolveFieldName(target, currentStep.action, intent.kind === "set_text" ? ["TEXT", "NAME"] : ["TIMES", "VALUE"]);
    if (!fieldName) {
      setLastFeedback("Không tìm thấy ô dữ liệu phù hợp trong khối đang chọn.");
      return false;
    }
    target.setFieldValue(intent.kind === "set_text" ? intent.text : String(intent.value), fieldName);
    return true;
  }

  function applyIntentToWorkspace(intent: VoiceIntent) {
    const workspace = workspaceRef.current;
    if (!workspace || !currentStep) return { changed: false, shouldEvaluate: false };
    switch (intent.kind) {
      case "add_block": {
        const block = workspace.newBlock(typeMap[intent.blockType]) as Blockly.BlockSvg;
        block.initSvg();
        block.render();
        const { x, y } = getInsertPosition(workspace);
        block.moveBy(x, y);
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

  // Load the current step's starter on every step change. Suppress eval
  // during the load so the burst of Blockly events doesn't trigger advance.
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspaceReady || !workspace || !currentStep) return;
    suppressEvaluationRef.current = true;
    workspace.clear();
    Blockly.serialization.workspaces.load(starterStateFromWorkspace(currentStep.starterWorkspace), workspace);
    // Hold suppression for the next macrotask — Blockly may fire events
    // asynchronously after load() returns.
    const id = window.setTimeout(() => {
      suppressEvaluationRef.current = false;
    }, 50);
    return () => window.clearTimeout(id);
  }, [currentStep, workspaceReady]);

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

  return (
    <section className="grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]">
      <div className="flex min-h-0 flex-col rounded-[1.4rem] border-4 border-black bg-white shadow-[8px_8px_0_#121212]">
        <div className="border-b-4 border-black px-4 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black">
            Bước {currentStepIndex + 1} / {lesson.steps.length}
          </p>
          <p className="mt-0.5 text-base font-bold text-black">{currentStep.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-700">{currentStep.instructions}</p>
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
        <div className="min-h-[36px] px-3 py-1.5 text-xs">
          {!speech.isSupported && (
            <p className="text-red-600">Trình duyệt chưa hỗ trợ nhận giọng nói — dùng chuột để kéo khối.</p>
          )}
          {speech.errorMessage && <p className="text-red-600">{speech.errorMessage}</p>}
          {lastFeedback && <p className="font-semibold text-black">{lastFeedback}</p>}
          {!lastFeedback && !speech.errorMessage && voiceLog.length > 0 && (
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
