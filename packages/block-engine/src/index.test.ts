import assert from "node:assert/strict";

import type { ProgramWorkspace, WorkspaceBlock } from "@shecancode/shared-types";

import { evaluateReporter, executeProgram } from "./index";

function createWorkspace(blocks: WorkspaceBlock[]): ProgramWorkspace {
  return {
    version: 1,
    blocks,
  };
}

const legacyPrintResult = executeProgram(
  createWorkspace([
    { id: "start-1", type: "start" },
    { id: "print-1", type: "print", fields: { text: "Xin chào" } },
  ]),
);
assert.equal(legacyPrintResult.success, true);
assert.deepEqual(legacyPrintResult.output, ["Xin chào"]);

const reporterPrintResult = executeProgram(
  createWorkspace([
    { id: "start-2", type: "start" },
    {
      id: "print-2",
      type: "print",
      inputs: {
        text: {
          id: "text-1",
          type: "text_literal",
          fields: { value: "Hello" },
        },
      },
    },
  ]),
);
assert.equal(reporterPrintResult.success, true);
assert.deepEqual(reporterPrintResult.output, ["Hello"]);

const variableReporterResult = executeProgram(
  createWorkspace([
    { id: "start-3", type: "start" },
    { id: "variable-1", type: "variable", fields: { name: "score", value: "10" } },
    {
      id: "print-3",
      type: "print",
      inputs: {
        text: {
          id: "variable-get-1",
          type: "variable_get",
          fields: { name: "score" },
        },
      },
    },
  ]),
);
assert.equal(variableReporterResult.success, true);
assert.deepEqual(variableReporterResult.output, ["10"]);

const missingVariableResult = executeProgram(
  createWorkspace([
    { id: "start-4", type: "start" },
    {
      id: "print-4",
      type: "print",
      inputs: {
        text: {
          id: "variable-get-2",
          type: "variable_get",
          fields: { name: "unknown" },
        },
      },
    },
  ]),
);
assert.equal(missingVariableResult.success, true);
assert.deepEqual(missingVariableResult.output, [""]);

const repeatReporterResult = executeProgram(
  createWorkspace([
    { id: "start-5", type: "start" },
    {
      id: "repeat-1",
      type: "repeat",
      inputs: {
        times: {
          id: "number-1",
          type: "number_literal",
          fields: { value: 3 },
        },
      },
      children: [{ id: "print-5", type: "print", fields: { text: "x" } }],
    },
  ]),
);
assert.equal(repeatReporterResult.success, true);
assert.deepEqual(repeatReporterResult.output, ["x", "x", "x"]);

const booleanReporterResult = executeProgram(
  createWorkspace([
    { id: "start-boolean", type: "start" },
    {
      id: "if-boolean",
      type: "if",
      inputs: {
        condition: {
          id: "bool-1",
          type: "boolean_literal",
          fields: { value: true },
        },
      },
      children: [{ id: "print-boolean", type: "print", fields: { text: "đúng" } }],
    },
  ]),
);
assert.equal(booleanReporterResult.success, true);
assert.deepEqual(booleanReporterResult.output, ["đúng"]);

const precedenceResult = executeProgram(
  createWorkspace([
    { id: "start-6", type: "start" },
    {
      id: "print-6",
      type: "print",
      fields: { text: "literal" },
      inputs: {
        text: {
          id: "text-2",
          type: "text_literal",
          fields: { value: "from input" },
        },
      },
    },
  ]),
);
assert.equal(precedenceResult.success, true);
assert.deepEqual(precedenceResult.output, ["from input"]);

const emptyWorkspaceResult = executeProgram(createWorkspace([]));
assert.equal(emptyWorkspaceResult.success, false);
assert.deepEqual(emptyWorkspaceResult.errors, ["Workspace chưa có khối nào."]);

const noStartBlockResult = executeProgram(
  createWorkspace([{ id: "print-7", type: "print", fields: { text: "missing start" } }]),
);
assert.equal(noStartBlockResult.success, false);
assert.deepEqual(noStartBlockResult.errors, ["Chương trình cần có khối bắt đầu."]);

const boundedResult = executeProgram(createWorkspace([
  { id: "start-safe", type: "start" },
  { id: "repeat-safe", type: "repeat", fields: { times: 1_000_000_000 }, children: [] },
]));
assert.equal(boundedResult.success, false);
assert.match(boundedResult.errors.join(" "), /giới hạn chạy an toàn/);

assert.throws(
  () => evaluateReporter({ id: "print-8", type: "print", fields: { text: "oops" } }, {}),
  /evaluateReporter does not handle non-reporter block kind: print/,
);

console.log("block-engine tests passed");
