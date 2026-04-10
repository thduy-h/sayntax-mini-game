"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import * as Blockly from "blockly";
import type { LessonV2WithSteps } from "@shecancode/lesson-engine";
import type { ProgramWorkspace, WorkspaceBlock } from "@shecancode/shared-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface VoiceLessonClientProps {
  lesson: LessonV2WithSteps;
}

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
  const typeMap = { start: "scc_start", print: "scc_print", repeat: "scc_repeat", if: "scc_if", variable: "scc_variable" } as const;
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

export function VoiceLessonClient({ lesson }: VoiceLessonClientProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const currentStep: LessonV2WithSteps["steps"][number] | undefined = lesson.steps[currentStepIndex];

  useEffect(() => {
    setCurrentStepIndex(0);
  }, [lesson.id]);

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
      Blockly.serialization.workspaces.load(starterStateFromWorkspace(currentStep.starterWorkspace), workspace);
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
    workspace.clear();
    Blockly.serialization.workspaces.load(starterStateFromWorkspace(currentStep.starterWorkspace), workspace);
  }, [currentStep, workspaceReady]);

  if (!currentStep) {
    return (
      <section className="rounded-[1.4rem] border-4 border-black bg-[#fffdf3] p-6 shadow-[8px_8px_0_#121212]">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-black">Bài học chưa sẵn sàng</p>
        <p className="mt-3 text-base text-black">Không tìm thấy bước hiện tại để hiển thị workspace.</p>
      </section>
    );
  }

  function prevStep() {
    setCurrentStepIndex((index) => Math.max(0, index - 1));
  }

  function nextStep() {
    setCurrentStepIndex((index) => Math.min(lesson.steps.length - 1, index + 1));
  }

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
          <CardHeader><CardTitle>Gợi ý</CardTitle></CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1 text-sm">
              {currentStep.hints.map((h, i) => <li key={i}>{i + 1}. {h}</li>)}
            </ul>
          </CardContent>
        </Card>
      </aside>
    </section>
  );
}
