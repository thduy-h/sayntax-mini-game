import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("features/lesson-v2/components/voice-lesson-client.tsx", "utf8");

assert.equal(source.includes('id="commandInput"'), false);
assert.equal(source.includes("Nhập câu lệnh"), false);
assert.equal(source.includes("handleTranscriptCommand(command, \"text\")"), true);
assert.equal(source.includes('if (lessonComplete) return handleCompletionCommand(rawTranscript);'), true);
assert.equal(source.includes('const parsed = parseVoiceCommandInput(source, rawTranscript);'), true);
assert.ok(source.indexOf('if (lessonComplete) return handleCompletionCommand(rawTranscript);') < source.indexOf('const parsed = parseVoiceCommandInput(source, rawTranscript);'));
assert.equal(source.includes('if (lessonComplete) return handleCompletionCommand(heardTranscript);'), true);
assert.equal(source.includes('runCompletionModalCommand(command, Boolean(nextLesson)'), true);
assert.equal(source.includes('handleTranscriptCommand(completionCommand, "text")'), true);
assert.equal(source.includes('onClick={restartLesson}'), true);
assert.equal(source.includes("onClick={requestHintFromButton}"), true);
assert.equal(source.includes('evaluateAndMaybeAdvance({ kind: "ask_hint" })'), true);

const commandBar = readFileSync("features/voice-control/components/global-command-bar.tsx", "utf8");
assert.equal(commandBar.includes('id="globalCommandInput"'), true);
assert.equal(commandBar.includes("submitCommand(value)"), true);

console.log("voice-lesson-client contract tests passed");
