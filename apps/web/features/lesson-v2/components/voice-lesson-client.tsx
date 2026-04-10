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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    setCurrentStepIndex(0);
  }, [lesson.id]);

  useEffect(() => {
    setFailCount(0);
    setLastFeedback(null);
    setShowSkip(false);
    setHintIndex(0);
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
    const workspace = workspaceRef.current;
    if (!workspace || !currentStep) return;
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
    if (currentStep) {
      suppressEvaluationRef.current = true;
      Blockly.serialization.workspaces.load(starterStateFromWorkspace(currentStep.starterWorkspace), workspace);
      suppressEvaluationRef.current = false;
    }
    setWorkspaceReady(true);
    return () => {
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, [currentStep]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspaceReady || !workspace || !currentStep) return;
    suppressEvaluationRef.current = true;
    workspace.clear();
    Blockly.serialization.workspaces.load(starterStateFromWorkspace(currentStep.starterWorkspace), workspace);
    suppressEvaluationRef.current = false;
  }, [currentStep, workspaceReady]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace || !currentStep) return;
    const onChange = (event: Blockly.Events.Abstract) => {
      if (suppressEvaluationRef.current) return;
      if (
        event.type === Blockly.Events.CLICK ||
        event.type === Blockly.Events.SELECTED ||
        event.type === Blockly.Events.VIEWPORT_CHANGE
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
    setVoiceLog((items) => [...items, transcript].slice(-5));
    const intent = parseVoiceIntent(transcript);
    suppressEvaluationRef.current = true;
    const outcome = applyIntentToWorkspace(intent);
    suppressEvaluationRef.current = false;
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
    <section className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]">
      <div>
        <Card>
          <CardHeader>
            <p>Bước {currentStepIndex + 1} / {lesson.steps.length}</p>
            <CardTitle>{currentStep.title}</CardTitle>
            <CardDescription>{currentStep.instructions}</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={containerRef} style={{ height: 520 }} className="w-full border-4 border-black" />
            <div className="mt-4 flex flex-col gap-2">
              {!speech.isSupported && (
                <p className="text-sm text-red-600">Trình duyệt hiện tại chưa hỗ trợ nhận giọng nói. Bạn có thể tiếp tục bằng chuột.</p>
              )}
              <div className="flex items-center gap-2">
                <Button onClick={() => (speech.isListening ? speech.stopListening() : speech.startListening())} disabled={!speech.isSupported}>
                  {speech.isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                  {speech.isListening ? "Dừng ghi âm" : "Bắt đầu nói"}
                </Button>
                {showSkip && (
                  <Button variant="secondary" onClick={() => { nextStep(); setFailCount(0); setShowSkip(false); }}>
                    Bỏ qua bước này
                  </Button>
                )}
              </div>
              {speech.errorMessage && <p className="text-sm text-red-600">{speech.errorMessage}</p>}
              {speech.transcript && <p className="text-sm font-mono">Bạn nói: "{speech.transcript}"</p>}
              {voiceLog.length > 0 && <p className="text-xs text-muted-foreground">Lần nói gần đây: {voiceLog.join(" • ")}</p>}
              {lastFeedback && <p className="text-sm font-semibold">{lastFeedback}</p>}
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={prevStep} disabled={currentStepIndex === 0}>← Bước trước</Button>
              <Button onClick={nextStep} disabled={currentStepIndex >= lesson.steps.length - 1}>Bước sau →</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <aside>
        <Card>
          <CardHeader><CardTitle>Các bước</CardTitle></CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2">
              {lesson.steps.map((step, i) => (
                <li key={step.id}>
                  <button onClick={() => setCurrentStepIndex(i)} className={i === currentStepIndex ? "font-black underline" : ""}>
                    Bước {i + 1}: {step.title}
                  </button>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card className="mt-4 bg-[#fff6fb]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="h-4 w-4" />Gợi ý</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm">{activeHint ?? "Chưa có gợi ý cho bước này."}</p>
            <Button variant="secondary" onClick={advanceHint} disabled={currentStep.hints.length === 0}>
              Gợi ý
            </Button>
          </CardContent>
        </Card>
      </aside>
    </section>
  );
}
