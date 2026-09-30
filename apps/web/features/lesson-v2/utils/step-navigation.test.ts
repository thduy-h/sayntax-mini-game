import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { planStepNavigation, willReplaceWorkspace, workspaceContentSignature } from "./step-navigation";

assert.deepEqual(planStepNavigation(2, 1, 5, true, false), {
  status: "navigate", replacesWorkspace: true, needsConfirmation: true,
});
assert.deepEqual(planStepNavigation(2, 1, 5, true, true), {
  status: "navigate", replacesWorkspace: true, needsConfirmation: false,
});
assert.deepEqual(planStepNavigation(0, 3, 5, true, false), {
  status: "navigate", replacesWorkspace: true, needsConfirmation: true,
});
assert.deepEqual(planStepNavigation(3, 0, 5, true, true), {
  status: "navigate", replacesWorkspace: true, needsConfirmation: false,
});
assert.deepEqual(planStepNavigation(0, 2, 5, false, false), {
  status: "navigate", replacesWorkspace: true, needsConfirmation: false,
});
assert.deepEqual(planStepNavigation(1, 2, 5, true, false), {
  status: "navigate", replacesWorkspace: false, needsConfirmation: false,
});
assert.deepEqual(planStepNavigation(2, 2, 5, true, false), {
  status: "same", replacesWorkspace: false, needsConfirmation: false,
});
assert.deepEqual(planStepNavigation(2, 5, 5, true, false), {
  status: "invalid", replacesWorkspace: false, needsConfirmation: false,
});
assert.equal(willReplaceWorkspace(2, 1, true), true);
assert.equal(willReplaceWorkspace(1, 2, true), false);

const starter = { blocks: { blocks: [{ id: "start", type: "scc_start" }] }, viewport: { x: 0 } };
const sameContent = { blocks: { blocks: [{ id: "start", type: "scc_start" }] }, viewport: { x: 100 } };
const edited = { blocks: { blocks: [{ id: "start", type: "scc_start", next: { block: { type: "scc_print" } } }] } };
assert.equal(workspaceContentSignature(starter), workspaceContentSignature(sameContent));
assert.notEqual(workspaceContentSignature(starter), workspaceContentSignature(edited));
assert.notEqual(workspaceContentSignature(starter), workspaceContentSignature({ ...starter, variables: [{ name: "diem" }] }));

const client = readFileSync("features/lesson-v2/components/voice-lesson-client.tsx", "utf8");
assert.match(client, /planStepNavigation\(/);
assert.match(client, /willReplaceWorkspace\(prevIndex, currentStepIndex/);
assert.match(client, /Blockly\.serialization\.workspaces\.load\(starterStateFromWorkspace\(currentStep\.starterWorkspace\), workspace\)/);
assert.match(client, /pendingAction\.kind === "step_navigation"/);
assert.match(client, /pendingAction\.fromStepIndex !== currentStepIndex/);
assert.match(client, /if \(intent\.kind === "navigate_step"\)/);
assert.ok(client.includes('requestStepNavigation(i, "sidebar")'));
assert.match(client, /setPreviousStepResult\(null\)/);
assert.match(client, /setRunResult\(null\)/);
assert.match(client, /setCurrentStepIndex\(targetIndex\)/);
assert.match(client, /setStepNavigationNotice\(\{ targetIndex, feedback \}\)/);
assert.match(client, /if \(lessonComplete\) return handleCompletionCommand\(rawTranscript\)/);
const cancelCode = client.slice(client.indexOf("function cancelPendingAction"), client.indexOf("function makeWorkspaceCommandResult"));
assert.doesNotMatch(cancelCode, /setCurrentStepIndex|workspace\.clear|workspaces\.load/);
const advanceCode = client.slice(client.indexOf("function resetAfterSuccess"), client.indexOf("function markStepPassed"));
assert.doesNotMatch(advanceCode, /requestStepNavigation/);

console.log("step navigation tests passed");
