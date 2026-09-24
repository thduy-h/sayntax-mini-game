import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("features/lesson-v2/components/voice-lesson-client.tsx", "utf8");

assert.equal(source.includes('id="commandInput"'), false);
assert.equal(source.includes("Nhập câu lệnh"), false);
assert.equal(source.includes("handleTranscriptCommand(command, \"text\")"), true);

console.log("voice-lesson-client contract tests passed");
