import assert from "node:assert/strict";

import { createVoiceCommandRankingContext, parseVoiceCommandInput, rankVoiceCommandAlternatives } from "./voice-command-input";

const text = parseVoiceCommandInput("text", "thêm khối bắt đầu");
const voice = parseVoiceCommandInput("microphone", "thêm khối bắt đầu");

assert.deepEqual(text?.intent, voice?.intent);
assert.equal(text?.source, "text");
assert.equal(voice?.source, "microphone");
assert.equal(parseVoiceCommandInput("text", "   "), null);
assert.deepEqual(parseVoiceCommandInput("text", "abc xyz")?.intent, { kind: "unknown", reason: "no_match" });
assert.deepEqual(parseVoiceCommandInput("text", "hoàn tác")?.intent, { kind: "undo_last" });
assert.deepEqual(parseVoiceCommandInput("text", "đúng rồi")?.intent, { kind: "confirm" });
assert.deepEqual(parseVoiceCommandInput("text", "hủy")?.intent, { kind: "cancel" });

const rankingContext = createVoiceCommandRankingContext(
  { blockType: "repeat", kind: "add_block" },
  "thêm khối lặp",
);
const ranked = rankVoiceCommandAlternatives(
  [
    { confidence: 0.9, transcript: "thêm khối in" },
    { confidence: 0.2, transcript: "thêm khối lặp" },
  ],
  rankingContext,
);
assert.equal(ranked.status, "accept");
assert.deepEqual(ranked.best.intent, { kind: "add_block", blockType: "repeat" });

console.log("voice-command-input tests passed");
