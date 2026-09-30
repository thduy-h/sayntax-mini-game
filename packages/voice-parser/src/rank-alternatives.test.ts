import assert from "node:assert/strict";

import { rankSpeechAlternatives } from "./rank-alternatives";

const addRepeatContext = { expectedBlockType: "repeat", expectedIntentKind: "add_block" } as const;

const secondAlternativeWins = rankSpeechAlternatives(
  [
    { confidence: 0.91, transcript: "thêm khối in" },
    { confidence: 0.42, transcript: "thêm khối lặp" },
  ],
  addRepeatContext,
);
assert.equal(secondAlternativeWins.status, "accept");
assert.equal(secondAlternativeWins.best.transcript, "thêm khối lặp");
assert.deepEqual(secondAlternativeWins.best.intent, { kind: "add_block", blockType: "repeat" });

const contextBoost = rankSpeechAlternatives(
  [
    { transcript: "thêm khối in" },
    { transcript: "thêm khối lặp" },
  ],
  addRepeatContext,
);
if (contextBoost.status === "reject") throw new Error("contextBoost should not reject");
assert.equal(contextBoost.best.transcript, "thêm khối lặp");

const missingConfidence = rankSpeechAlternatives([{ transcript: "chạy chương trình" }], {
  expectedIntentKind: "run_program",
});
assert.equal(missingConfidence.status, "accept");
assert.deepEqual(missingConfidence.best.intent, { kind: "run_program" });

const ambiguous = rankSpeechAlternatives([
  { transcript: "thêm khối in" },
  { transcript: "thêm in" },
]);
assert.equal(ambiguous.status, "confirm");

const rejected = rankSpeechAlternatives([{ transcript: "xin chào bạn ơi" }]);
assert.equal(rejected.status, "reject");

const repeatTimes = rankSpeechAlternatives([{ transcript: "thêm khối lặp 5 lần" }], addRepeatContext);
assert.equal(repeatTimes.status, "accept");
assert.deepEqual(repeatTimes.best.intent, { kind: "add_block", blockType: "repeat", fields: { times: 5 } });

const nearAsr = rankSpeechAlternatives([{ transcript: "tạo vòng lập" }], addRepeatContext);
assert.equal(nearAsr.status, "accept");
assert.deepEqual(nearAsr.best.intent, { kind: "add_block", blockType: "repeat" });

const navigation = rankSpeechAlternatives([{ confidence: 0.95, transcript: "bước trước" }], addRepeatContext);
assert.equal(navigation.status, "accept");
assert.deepEqual(navigation.best.intent, { kind: "navigate_step", target: "previous" });

console.log("rank-alternatives tests passed");
