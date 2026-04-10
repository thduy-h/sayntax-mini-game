import assert from "node:assert/strict";

import { parseVoiceIntent } from "./parse-intent";

assert.deepEqual(parseVoiceIntent("them khoi bat dau"), { kind: "add_block", blockType: "start" });
assert.deepEqual(parseVoiceIntent("khoi bat dau"), { kind: "add_block", blockType: "start" });
assert.deepEqual(parseVoiceIntent("them in"), { kind: "add_block", blockType: "print" });
assert.deepEqual(parseVoiceIntent("in ra"), { kind: "add_block", blockType: "print" });
assert.deepEqual(parseVoiceIntent("them khoi lap"), { kind: "add_block", blockType: "repeat" });
assert.deepEqual(parseVoiceIntent("lap lai"), { kind: "add_block", blockType: "repeat" });
assert.deepEqual(parseVoiceIntent("them dieu kien"), { kind: "add_block", blockType: "if" });
assert.deepEqual(parseVoiceIntent("neu thi"), { kind: "add_block", blockType: "if" });
assert.deepEqual(parseVoiceIntent("them bien"), { kind: "add_block", blockType: "variable" });
assert.deepEqual(parseVoiceIntent("tao bien"), { kind: "add_block", blockType: "variable" });

assert.deepEqual(parseVoiceIntent("bo vo khoi lap"), {
  kind: "insert_into",
  parentHint: "repeat",
  childHint: undefined,
});
assert.deepEqual(parseVoiceIntent("dat vao trong"), {
  kind: "insert_into",
  parentHint: undefined,
  childHint: undefined,
});
assert.deepEqual(parseVoiceIntent("xin chao ban"), { kind: "unknown", reason: "no_match" });

assert.deepEqual(parseVoiceIntent("Đặt chữ Xin chào"), { kind: "set_text", text: "Xin chào" });
assert.deepEqual(parseVoiceIntent("go chu hello world"), { kind: "set_text", text: "hello world" });

assert.deepEqual(parseVoiceIntent("đặt số 5"), { kind: "set_number", value: 5 });
assert.deepEqual(parseVoiceIntent("đặt số năm"), { kind: "set_number", value: 5 });
assert.deepEqual(parseVoiceIntent("gia tri hai muoi"), { kind: "set_number", value: 20 });
assert.deepEqual(parseVoiceIntent("cho so muoi lam"), { kind: "set_number", value: 15 });
assert.deepEqual(parseVoiceIntent("dat so abcxyz"), { kind: "unknown", reason: "no_match" });

assert.deepEqual(parseVoiceIntent("chạy chương trình"), { kind: "run_program" });
assert.deepEqual(parseVoiceIntent("chay di"), { kind: "run_program" });
assert.deepEqual(parseVoiceIntent("chạy"), { kind: "run_program" });

assert.deepEqual(parseVoiceIntent("gợi ý"), { kind: "ask_hint" });
assert.deepEqual(parseVoiceIntent("giup voi"), { kind: "ask_hint" });

assert.deepEqual(parseVoiceIntent(""), { kind: "unknown", reason: "empty" });
assert.deepEqual(parseVoiceIntent("abcxyz qwerty"), { kind: "unknown", reason: "no_match" });
assert.deepEqual(parseVoiceIntent("thêm"), { kind: "unknown", reason: "partial_add_block" });
assert.deepEqual(parseVoiceIntent("cho tôi"), { kind: "unknown", reason: "partial_add_block" });

assert.deepEqual(parseVoiceIntent("thêm khối in đi"), { kind: "add_block", blockType: "print" });
assert.deepEqual(parseVoiceIntent("hãy chạy chương trình"), { kind: "run_program" });

console.log("parse-intent tests passed");
