"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import * as Blockly from "blockly";
import { executeProgram } from "@shecancode/block-engine";
import { evaluateLessonStep } from "@shecancode/lesson-engine";
import { SUPPORTED_COMMAND_PATTERNS, parseVoiceCommand } from "@shecancode/voice-parser";
import type {
  BlockKind,
  LessonWithSteps,
  ProgramExecutionResult,
  ProgramWorkspace,
  ProgressStatus,
  VoiceCommandAction,
  VoiceCommandStatus,
  WorkspaceBlock,
} from "@shecancode/shared-types";
import { Mic, MicOff, Save, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSpeechRecognition } from "@/features/voice-control/hooks/use-speech-recognition";

const STORAGE_PREFIX = "shecancode-voice-workspace";
const WORKSPACE_HEIGHT = 560;
let registered = false;

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

type VoiceLog = { id: string; status: VoiceCommandStatus; transcript: string; summary: string };

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
  const typeMap: Partial<Record<BlockKind, string>> = { start: "scc_start", print: "scc_print", repeat: "scc_repeat", if: "scc_if", variable: "scc_variable" };
  const result: Record<string, unknown> = { id: block.id, type: typeMap[block.type] ?? block.type };
  if (x !== undefined) result.x = x;
  if (y !== undefined) result.y = y;
  const fields: Record<string, unknown> = {};
  if (block.type === "print" && block.fields?.text !== undefined) fields.TEXT = String(block.fields.text);
  if (block.type === "repeat" && block.fields?.times !== undefined) fields.TIMES = Number(block.fields.times);
  if (block.type === "if" && block.fields?.condition !== undefined) fields.CONDITION = block.fields.condition ? "TRUE" : "FALSE";
  if (block.type === "variable") { if (block.fields?.name !== undefined) fields.NAME = String(block.fields.name); if (block.fields?.value !== undefined) fields.VALUE = String(block.fields.value); }
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
    return { blocks: { languageVersion: 0, blocks: [{ id: "starter-start", type: "scc_start", x: 48, y: 40 }] } };
  }
  const blocklyBlocks: Record<string, unknown>[] = [];
  let yPos = 40;
  for (const block of workspace.blocks) {
    blocklyBlocks.push(domainBlockToBlockly(block, 48, yPos));
    yPos += 110;
  }
  return { blocks: { languageVersion: 0, blocks: blocklyBlocks } };
}

function starterState() {
  return { blocks: { languageVersion: 0, blocks: [{ id: "starter-start", type: "scc_start", x: 48, y: 40 }] } };
}

function storeKey(lessonId: string, stepId?: string) {
  return stepId ? `${STORAGE_PREFIX}:${lessonId}:${stepId}` : `${STORAGE_PREFIX}:${lessonId}`;
}

function getInsertPosition(workspace: Blockly.WorkspaceSvg) {
  const roots = workspace.getTopBlocks(true);
  if (!roots.length) return { x: 48, y: 40 };
  const last = roots[roots.length - 1].getRelativeToSurfaceXY();
  return { x: last.x, y: last.y + 110 };
}

function addBlockFromVoice(workspace: Blockly.WorkspaceSvg, action: Extract<VoiceCommandAction, { type: "add_block" }>) {
  const typeMap: Partial<Record<BlockKind, string>> = { start: "scc_start", print: "scc_print", repeat: "scc_repeat", if: "scc_if", variable: "scc_variable" };
  const blocklyType = typeMap[action.blockType];
  if (!blocklyType) return;
  const block = workspace.newBlock(blocklyType) as Blockly.BlockSvg;
  if (action.blockType === "repeat" && action.repeatCount) block.setFieldValue(String(action.repeatCount), "TIMES");
  block.initSvg();
  block.render();
  const { x, y } = getInsertPosition(workspace);
  block.moveBy(x, y);
}

function removeLastBlock(workspace: Blockly.WorkspaceSvg) {
  const roots = workspace.getTopBlocks(true);
  const last = roots[roots.length - 1] as Blockly.BlockSvg | undefined;
  if (!last) return false;
  let target = last;
  while (target.getNextBlock()) target = target.getNextBlock() as Blockly.BlockSvg;
  target.dispose(true);
  return true;
}

function setSelectedBlockValue(value: string | number) {
  const selected = Blockly.getSelected();
  if (!selected || !("type" in selected)) return false;
  const block = selected as Blockly.BlockSvg;
  if (block.type === "scc_print") block.setFieldValue(String(value), "TEXT");
  else if (block.type === "scc_repeat") block.setFieldValue(String(value), "TIMES");
  else if (block.type === "scc_variable") block.setFieldValue(String(value), "VALUE");
  else return false;
  return true;
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "vi-VN";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

function defaultStepIndex(lesson: LessonWithSteps, progressMap: Record<string, ProgressStatus>) {
  const firstIncomplete = lesson.steps.findIndex((step) => progressMap[step.databaseStepId] !== "completed");
  return firstIncomplete === -1 ? lesson.steps.length - 1 : firstIncomplete;
}

function blockLabel(type: Extract<VoiceCommandAction, { type: "add_block" }>["blockType"]) {
  const labels: Partial<Record<BlockKind, string>> = { start: "bắt đầu", print: "in", repeat: "lặp", if: "điều kiện", variable: "biến" };
  return labels[type] ?? type;
}

export function LessonWorkspace({ initialProgress = {}, lesson }: { initialProgress?: Record<string, ProgressStatus>; lesson: LessonWithSteps }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const processedTranscriptRef = useRef("");
  const [stepIndex, setStepIndex] = useState(() => defaultStepIndex(lesson, initialProgress));
  const [selectedBlockType, setSelectedBlockType] = useState("Chưa chọn khối");
  const [program, setProgram] = useState<ProgramWorkspace>({ version: 1, blocks: [] });
  const [result, setResult] = useState<ProgramExecutionResult | null>(null);
  const [status, setStatus] = useState("Bắt đầu bằng cách kéo block hoặc nói một lệnh ngắn.");
  const [logs, setLogs] = useState<VoiceLog[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ProgressStatus>>(initialProgress);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [isRestoringWorkspace, setIsRestoringWorkspace] = useState(false);
  const [isRunningProgram, setIsRunningProgram] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastRunSavedAt, setLastRunSavedAt] = useState<string | null>(null);
  const { errorMessage, isListening, isSupported, startListening, stopListening, transcript } = useSpeechRecognition();

  const step = lesson.steps[stepIndex] ?? lesson.steps[0];
  const stepProgress = progressMap[step.databaseStepId] ?? "not_started";
  const stats = useMemo(() => {
    const total = program.blocks.reduce((count, block) => count + 1 + (block.children?.length ?? 0), 0);
    return { total, topLevel: program.blocks.length };
  }, [program.blocks]);

  function addLog(entry: Omit<VoiceLog, "id">) {
    setLogs((current) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...entry }, ...current].slice(0, 6));
  }

  async function persistVoiceLog(payload: { action: VoiceCommandAction; normalizedTranscript: string; status: VoiceCommandStatus; transcript: string }) {
    try {
      await fetch("/api/voice-command-logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: lesson.databaseLessonId, lessonStepId: step.databaseStepId, transcript: payload.transcript, normalizedTranscript: payload.normalizedTranscript, parsedAction: payload.action, status: payload.status, failureReason: payload.action.type === "unsupported" ? payload.action.reason : payload.status === "error" ? "Không áp dụng được lệnh vào workspace hiện tại." : null }) });
    } catch {}
  }

  async function persistProgress(nextStatus: Extract<ProgressStatus, "in_progress" | "completed">, lessonStepId = step.databaseStepId) {
    const currentStatus = progressMap[lessonStepId] ?? "not_started";
    if (currentStatus === "completed" || currentStatus === nextStatus) return;
    try {
      const response = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: lesson.databaseLessonId, lessonStepId, status: nextStatus }) });
      if (!response.ok) return;
      setProgressMap((current) => ({ ...current, [lessonStepId]: nextStatus }));
    } catch {}
  }

  const markCurrentStepInProgress = useEffectEvent(() => {
    void persistProgress("in_progress");
  });

  function captureSnapshot() {
    return workspaceRef.current ? Blockly.serialization.workspaces.save(workspaceRef.current) : null;
  }

  async function saveProgramSnapshot(snapshot: unknown) {
    const response = await fetch("/api/programs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: lesson.databaseLessonId, lessonStepId: step.databaseStepId, workspaceState: snapshot }) });
    if (!response.ok) throw new Error("SAVE_FAILED");
    const payload = (await response.json()) as { program?: { updatedAt?: string } };
    setLastSavedAt(payload.program?.updatedAt ?? new Date().toISOString());
  }

  async function loadProgramSnapshot() {
    const response = await fetch(`/api/programs?lessonStepId=${step.databaseStepId}`, { method: "GET", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("LOAD_FAILED");
    const payload = (await response.json()) as { program?: { workspaceState?: unknown } | null };
    return payload.program?.workspaceState ?? null;
  }

  async function saveProgramRun(snapshot: unknown, executionResult: ProgramExecutionResult) {
    const response = await fetch("/api/program-runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: lesson.databaseLessonId, lessonStepId: step.databaseStepId, workspaceState: snapshot, executionResult }) });
    if (!response.ok) throw new Error("RUN_SAVE_FAILED");
    const payload = (await response.json()) as { run?: { createdAt?: string } };
    setLastRunSavedAt(payload.run?.createdAt ?? new Date().toISOString());
  }

  useEffect(() => {
    ensureBlocks();
    if (!hostRef.current || workspaceRef.current) return;
    const workspace = Blockly.inject(hostRef.current, { toolbox, theme, trashcan: true, grid: { colour: "#d1d5db", length: 28, snap: true, spacing: 28 }, move: { drag: true, scrollbars: true, wheel: true }, zoom: { controls: true, maxScale: 1.4, minScale: 0.7, startScale: 0.92, wheel: true } });
    workspaceRef.current = workspace;
    const raw = window.localStorage.getItem(storeKey(lesson.id, step.id));
    if (raw) Blockly.serialization.workspaces.load(JSON.parse(raw), workspace);
    else Blockly.serialization.workspaces.load(starterStateFromWorkspace(step.starterWorkspace), workspace);
    const sync = () => {
      setProgram(toProgram(workspace));
      const selected = Blockly.getSelected();
      setSelectedBlockType(selected && "type" in selected ? String(selected.type) : "Chưa chọn khối");
    };
    window.requestAnimationFrame(sync);
    workspace.addChangeListener(sync);
    return () => { workspace.dispose(); workspaceRef.current = null; };
  }, [lesson.id]);

  const prevStepRef = useRef(step.id);
  useEffect(() => {
    const currentWorkspace = workspaceRef.current;
    if (!currentWorkspace || prevStepRef.current === step.id) return;
    const snapshot = captureSnapshot();
    if (snapshot) window.localStorage.setItem(storeKey(lesson.id, prevStepRef.current), JSON.stringify(snapshot));
    prevStepRef.current = step.id;
    const raw = window.localStorage.getItem(storeKey(lesson.id, step.id));
    if (raw) Blockly.serialization.workspaces.load(JSON.parse(raw), currentWorkspace);
    else Blockly.serialization.workspaces.load(starterStateFromWorkspace(step.starterWorkspace), currentWorkspace);
    setResult(null);
    setStatus("Đã chuyển bước. Workspace đã cập nhật theo bước mới.");
  }, [step.id, lesson.id]);

  useEffect(() => {
    const hasMeaningfulBlocks = stats.total > 1 || program.blocks.some((block) => block.type !== "start");
    if (hasMeaningfulBlocks && stepProgress === "not_started") markCurrentStepInProgress();
  }, [program.blocks, stats.total, step.databaseStepId, stepProgress]);

  function runProgram() {
    const currentWorkspace = workspaceRef.current;
    if (!currentWorkspace) return null;
    const nextProgram = toProgram(currentWorkspace);
    const nextResult = executeProgram(nextProgram);
    const snapshot = captureSnapshot();
    setProgram(nextProgram);
    setResult(nextResult);
    setStatus(nextResult.success ? "Chương trình chạy ổn. Kết quả đã được lưu vào lịch sử." : "Chương trình có lỗi. Hãy nhìn lại phần đầu ra và gợi ý.");
    if (snapshot) {
      setIsRunningProgram(true);
      void saveProgramRun(snapshot, nextResult)
        .catch(() => {
          setStatus(nextResult.success ? "Chương trình đã chạy nhưng chưa lưu được lịch sử chạy." : "Chương trình có lỗi và chưa lưu được lịch sử chạy.");
        })
        .finally(() => setIsRunningProgram(false));
    }
    return { program: nextProgram, result: nextResult };
  }

  async function checkAnswer() {
    const runData = runProgram();
    if (!runData) return;
    const evaluation = evaluateLessonStep(lesson.id, step.id, runData.program, runData.result);
    setStatus(evaluation.feedback);
    if (evaluation.completed) {
      await persistProgress("completed", step.databaseStepId);
      setStepIndex((current) => (lesson.steps[current]?.id === step.id && current < lesson.steps.length - 1 ? current + 1 : current));
    }
  }

  function saveWorkspace() {
    const snapshot = captureSnapshot();
    if (!snapshot) return;
    window.localStorage.setItem(storeKey(lesson.id, step.id), JSON.stringify(snapshot));
    setIsSavingWorkspace(true);
    setStatus("Đang lưu workspace...");
    void saveProgramSnapshot(snapshot)
      .then(() => { setStatus("Đã lưu workspace trên trình duyệt và tài khoản."); void persistProgress("in_progress"); })
      .catch(() => setStatus("Đã lưu trên trình duyệt nhưng chưa đẩy được lên tài khoản."))
      .finally(() => setIsSavingWorkspace(false));
  }

  function restoreWorkspace() {
    const currentWorkspace = workspaceRef.current;
    if (!currentWorkspace) return;
    setIsRestoringWorkspace(true);
    setStatus("Đang khôi phục bài làm...");
    void loadProgramSnapshot()
      .then((serverSnapshot) => {
        if (serverSnapshot) {
          Blockly.serialization.workspaces.load(serverSnapshot as never, currentWorkspace);
          window.localStorage.setItem(storeKey(lesson.id), JSON.stringify(serverSnapshot));
          setStatus("Đã khôi phục bài làm đã lưu trên tài khoản.");
          return;
        }
        const raw = window.localStorage.getItem(storeKey(lesson.id, step.id));
        if (!raw) {
          setStatus("Chưa có bài làm đã lưu để khôi phục.");
          return;
        }
        Blockly.serialization.workspaces.load(JSON.parse(raw), currentWorkspace);
        setStatus("Đã khôi phục bài làm từ trình duyệt.");
      })
      .catch(() => setStatus("Chưa thể tải bài làm đã lưu lúc này."))
      .finally(() => setIsRestoringWorkspace(false));
  }

  function resetWorkspace() {
    if (!workspaceRef.current) return;
    workspaceRef.current.clear();
    Blockly.serialization.workspaces.load(starterState(), workspaceRef.current);
    setResult(null);
    setStatus("Đã đặt lại workspace về trạng thái ban đầu.");
  }

  function clearWorkspace() {
    if (!workspaceRef.current) return;
    workspaceRef.current.clear();
    setResult(null);
    setStatus("Đã xóa toàn bộ block.");
  }

  async function applyAction(action: VoiceCommandAction, transcriptText: string, normalizedTranscript: string) {
    const currentWorkspace = workspaceRef.current;
    if (!currentWorkspace) return;
    if (action.type === "unsupported") {
      setStatus(action.reason);
      addLog({ status: "unsupported", summary: action.reason, transcript: transcriptText });
      await persistVoiceLog({ action, normalizedTranscript, status: "unsupported", transcript: transcriptText });
      return;
    }
    if (action.type === "add_block") {
      addBlockFromVoice(currentWorkspace, action);
      const summary = `Đã thêm khối ${blockLabel(action.blockType)}.`;
      setStatus(summary);
      addLog({ status: "success", summary, transcript: transcriptText });
      await persistVoiceLog({ action, normalizedTranscript, status: "success", transcript: transcriptText });
      return;
    }
    if (action.type === "delete_last_block") {
      const ok = removeLastBlock(currentWorkspace);
      const summary = ok ? "Đã xóa khối cuối." : "Không có khối nào để xóa.";
      setStatus(summary);
      addLog({ status: ok ? "success" : "error", summary, transcript: transcriptText });
      await persistVoiceLog({ action, normalizedTranscript, status: ok ? "success" : "error", transcript: transcriptText });
      return;
    }
    if (action.type === "set_selected_block_value") {
      const ok = setSelectedBlockValue(action.value);
      const summary = ok ? `Đã đặt giá trị ${action.value}.` : "Hãy chọn khối in, lặp hoặc biến trước.";
      setStatus(summary);
      addLog({ status: ok ? "success" : "error", summary, transcript: transcriptText });
      await persistVoiceLog({ action, normalizedTranscript, status: ok ? "success" : "error", transcript: transcriptText });
      return;
    }
    if (action.type === "run_program") {
      runProgram();
      addLog({ status: "success", summary: "Đã chạy chương trình bằng giọng nói.", transcript: transcriptText });
      await persistVoiceLog({ action, normalizedTranscript, status: "success", transcript: transcriptText });
      return;
    }
    if (action.type === "read_instructions") {
      const ok = speak(`${step.title}. ${step.instructions}`);
      const summary = ok ? "Đang đọc hướng dẫn hiện tại." : "Trình duyệt không hỗ trợ phát giọng nói.";
      setStatus(summary);
      addLog({ status: ok ? "success" : "error", summary, transcript: transcriptText });
      await persistVoiceLog({ action, normalizedTranscript, status: ok ? "success" : "error", transcript: transcriptText });
      return;
    }
    await checkAnswer();
    addLog({ status: "success", summary: "Đã kiểm tra đáp án.", transcript: transcriptText });
    await persistVoiceLog({ action, normalizedTranscript, status: "success", transcript: transcriptText });
  }

  const onTranscript = useEffectEvent((transcriptText: string) => {
    const parsed = parseVoiceCommand(transcriptText);
    void applyAction(parsed.action, transcriptText, parsed.normalizedTranscript);
  });

  useEffect(() => {
    if (!transcript) { processedTranscriptRef.current = ""; return; }
    if (transcript === processedTranscriptRef.current) return;
    processedTranscriptRef.current = transcript;
    onTranscript(transcript);
  }, [transcript]);

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
      <aside className="space-y-4">
        <Card className="bg-[#fff6fb]">
          <CardHeader><p className="text-sm font-black uppercase tracking-[0.18em] text-black">Mục tiêu bài học</p><CardTitle>{lesson.title}</CardTitle><CardDescription>{lesson.description}</CardDescription></CardHeader>
          <CardContent className="space-y-3">{lesson.learningGoals.map((goal, index) => <div key={goal} className={`rounded-[1rem] border-4 border-black px-4 py-3 text-sm font-semibold text-black shadow-[5px_5px_0_#121212] ${index % 2 === 0 ? "bg-white" : "bg-[#ffefb8]"}`}>{goal}</div>)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Các bước</CardTitle><CardDescription>Bước hiện tại luôn nằm nổi bật để học sinh không bị lạc hướng.</CardDescription></CardHeader>
          <CardContent className="space-y-3">{lesson.steps.map((entry, index) => {
            const currentStatus = progressMap[entry.databaseStepId] ?? "not_started";
            const badgeLabel = currentStatus === "completed" ? "Xong" : currentStatus === "in_progress" ? "Đang làm" : "Chưa";
            return <button key={entry.id} className={`w-full rounded-[1rem] border-4 border-black px-4 py-3 text-left shadow-[5px_5px_0_#121212] ${index === stepIndex ? "bg-[#ff5f87] text-black" : "bg-white text-black"}`} onClick={() => setStepIndex(index)} type="button"><div className="flex items-center justify-between gap-3"><span className="block text-sm font-black uppercase">Bước {entry.orderIndex}</span><span className="rounded-[0.75rem] border-2 border-black bg-[#fffdf3] px-2 py-1 text-xs font-black uppercase">{badgeLabel}</span></div><span className="mt-2 block text-sm font-semibold">{entry.title}</span></button>;
          })}</CardContent>
        </Card>
      </aside>

      <section className="space-y-4">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-black bg-[#ffefb8] px-5 py-4">
            <div><p className="text-sm font-black uppercase tracking-[0.18em] text-black">Blockly workspace</p><p className="mt-1 text-sm font-semibold text-zinc-700">Bên trái là toolbox. Ở giữa là nơi kéo thả block và chạy bài.</p></div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveWorkspace} size="sm" variant="secondary">{isSavingWorkspace ? "Đang lưu" : "Lưu"}</Button>
              <Button onClick={restoreWorkspace} size="sm" variant="outline">{isRestoringWorkspace ? "Đang tải" : "Khôi phục"}</Button>
              <Button onClick={resetWorkspace} size="sm" variant="outline">Đặt lại</Button>
              <Button onClick={clearWorkspace} size="sm" variant="ghost">Xóa hết</Button>
              <Button onClick={() => void checkAnswer()} size="sm">{isRunningProgram ? "Đang chạy" : "Kiểm tra"}</Button>
            </div>
          </div>
          <div className="bg-[#fffdf3] p-3"><div className="overflow-hidden rounded-[1.2rem] border-4 border-black bg-white"><div ref={hostRef} style={{ height: WORKSPACE_HEIGHT, width: "100%" }} /></div></div>
        </Card>
      </section>

      <aside className="space-y-4">
        <Card className="bg-[#e7fff3]">
          <CardHeader><p className="text-sm font-black uppercase tracking-[0.18em] text-black">Mentor</p><CardTitle>{step.title}</CardTitle><CardDescription>{step.instructions}</CardDescription></CardHeader>
          <CardContent className="space-y-3">{step.hints.map((hint, index) => <div key={hint} className={`rounded-[1rem] border-4 border-black px-4 py-3 text-sm font-semibold shadow-[5px_5px_0_#121212] ${index % 2 === 0 ? "bg-white" : "bg-[#fff6fb]"}`}>{hint}</div>)}<Button className="w-full" onClick={() => { const ok = speak(`${step.title}. ${step.instructions}`); setStatus(ok ? "Đang đọc hướng dẫn." : "Trình duyệt không hỗ trợ phát giọng nói."); }} size="sm" variant="outline"><Volume2 className="mr-2 h-4 w-4" />Đọc hướng dẫn</Button></CardContent>
        </Card>
        <Card>
          <CardHeader><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black uppercase tracking-[0.18em] text-black">Giọng nói</p><CardTitle className="text-xl">Mic tiếng Việt</CardTitle></div>{isSupported ? <Button onClick={isListening ? stopListening : startListening} size="sm" variant={isListening ? "secondary" : "default"}>{isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}{isListening ? "Dừng mic" : "Bật mic"}</Button> : null}</div><CardDescription>Nói lệnh ngắn, rõ như “thêm khối bắt đầu”, “thêm khối in”, “chạy chương trình”.</CardDescription></CardHeader>
          <CardContent className="space-y-3"><div className="rounded-[1rem] border-4 border-black bg-[#fff6fb] px-4 py-3 text-sm font-semibold text-black"><strong>Transcript:</strong> {transcript || "Chưa có transcript"}</div>{errorMessage ? <div className="rounded-[1rem] border-4 border-black bg-[#ffd7e2] px-4 py-3 text-sm font-semibold text-black">{errorMessage}</div> : null}<div className="grid gap-2">{SUPPORTED_COMMAND_PATTERNS.slice(0, 5).map((command) => <div key={command} className="rounded-[1rem] border-4 border-black bg-white px-3 py-2 text-sm font-black uppercase text-black shadow-[4px_4px_0_#121212]">{command}</div>)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Trạng thái</CardTitle><CardDescription>{status}</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-sm font-semibold text-black">
            <div className="rounded-[1rem] border-4 border-black bg-white px-4 py-3"><strong>Khối đang chọn:</strong> {selectedBlockType}</div>
            <div className="rounded-[1rem] border-4 border-black bg-white px-4 py-3"><strong>Số khối cấp cao:</strong> {stats.topLevel}</div>
            <div className="rounded-[1rem] border-4 border-black bg-white px-4 py-3"><strong>Tổng block:</strong> {stats.total}</div>
            <div className="rounded-[1rem] border-4 border-black bg-[#ffefb8] px-4 py-3"><strong>Tiến độ bước:</strong> {stepProgress === "completed" ? "Đã hoàn thành" : stepProgress === "in_progress" ? "Đang làm" : "Chưa bắt đầu"}</div>
            <div className="rounded-[1rem] border-4 border-black bg-[#e7fff3] px-4 py-3"><div className="flex items-center gap-2 font-black uppercase"><Save className="h-4 w-4" />Lưu bài</div><p className="mt-2 text-xs font-semibold">{lastSavedAt ? `Workspace đã lưu lúc ${new Date(lastSavedAt).toLocaleTimeString("vi-VN")}` : "Chưa có bản lưu online cho bước này."}</p><p className="mt-1 text-xs font-semibold">{lastRunSavedAt ? `Lần chạy gần nhất được ghi lúc ${new Date(lastRunSavedAt).toLocaleTimeString("vi-VN")}` : "Chưa có lịch sử chạy nào được lưu."}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Đầu ra</CardTitle><CardDescription>Kết quả chạy chương trình và lỗi cơ bản sẽ hiện ở đây.</CardDescription></CardHeader>
          <CardContent className="space-y-3">{result ? <><div className={`rounded-[1rem] border-4 border-black px-4 py-3 text-sm font-black uppercase ${result.success ? "bg-[#7df2c3] text-black" : "bg-[#ffd7e2] text-black"}`}>{result.success ? "Chạy thành công" : "Có lỗi trong chương trình"}</div><div className="rounded-[1rem] border-4 border-black bg-white px-4 py-3"><p className="text-xs font-black uppercase">Dòng đầu ra</p><div className="mt-2 space-y-2">{result.output.length ? result.output.map((line, index) => <div key={`${line}-${index}`} className="rounded-[0.9rem] border-2 border-black bg-[#fffdf3] px-3 py-2 text-sm font-semibold text-black">{line}</div>) : <p className="text-sm font-medium text-zinc-600">Chưa có đầu ra.</p>}</div></div><div className="rounded-[1rem] border-4 border-black bg-white px-4 py-3"><p className="text-xs font-black uppercase">Biến hiện tại</p><pre className="mt-2 overflow-auto text-xs font-semibold text-black">{JSON.stringify(result.variables, null, 2)}</pre></div>{result.errors.length ? <div className="rounded-[1rem] border-4 border-black bg-[#ffd7e2] px-4 py-3 text-sm font-semibold text-black">{result.errors.map((error) => <p key={error}>{error}</p>)}</div> : null}</> : <div className="rounded-[1rem] border-4 border-black bg-white px-4 py-5 text-sm font-semibold text-zinc-700">Bấm <strong>Kiểm tra</strong> hoặc nói <strong>chạy chương trình</strong> để xem kết quả.</div>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Nhật ký giọng nói</CardTitle><CardDescription>Giúp kiểm tra xem transcript đã parse thành công hay chưa.</CardDescription></CardHeader>
          <CardContent className="space-y-3">{logs.length ? logs.map((entry) => <div key={entry.id} className="rounded-[1rem] border-4 border-black bg-white px-4 py-3 text-sm shadow-[4px_4px_0_#121212]"><div className="flex items-center justify-between gap-3"><strong className="text-black">{entry.transcript}</strong><span className={`rounded-[0.75rem] border-2 border-black px-2.5 py-1 text-xs font-black uppercase ${entry.status === "success" ? "bg-[#7df2c3]" : entry.status === "unsupported" ? "bg-[#ffefb8]" : "bg-[#ffd7e2]"}`}>{entry.status}</span></div><p className="mt-2 font-semibold text-zinc-700">{entry.summary}</p></div>) : <div className="rounded-[1rem] border-4 border-black bg-white px-4 py-5 text-sm font-semibold text-zinc-700">Chưa có lệnh giọng nói nào được ghi nhận.</div>}</CardContent>
        </Card>
      </aside>
    </div>
  );
}
