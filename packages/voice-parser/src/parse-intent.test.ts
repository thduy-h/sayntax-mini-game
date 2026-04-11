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

// --- Slice 1: add_block with position.inside ---
// Default "thêm khối X" carries NO position (UI interprets as after_current).
assert.deepEqual(parseVoiceIntent("them khoi in"), { kind: "add_block", blockType: "print" });
assert.deepEqual(parseVoiceIntent("them khoi lap"), { kind: "add_block", blockType: "repeat" });

// Explicit "vào trong Y" attaches a parentHint for the nested container.
assert.deepEqual(parseVoiceIntent("them khoi in vao trong khoi lap"), {
  kind: "add_block",
  blockType: "print",
  position: { kind: "inside", parentHint: "repeat" },
});
assert.deepEqual(parseVoiceIntent("thêm khối in vào trong khối lặp"), {
  kind: "add_block",
  blockType: "print",
  position: { kind: "inside", parentHint: "repeat" },
});
assert.deepEqual(parseVoiceIntent("them khoi in vao trong khoi dieu kien"), {
  kind: "add_block",
  blockType: "print",
  position: { kind: "inside", parentHint: "if" },
});
assert.deepEqual(parseVoiceIntent("them khoi in ben trong khoi neu"), {
  kind: "add_block",
  blockType: "print",
  position: { kind: "inside", parentHint: "if" },
});

// Partial trailing connector without a target falls back to plain add_block
// instead of becoming an unknown. The UI can then prompt the user.
assert.deepEqual(parseVoiceIntent("them khoi in vao trong"), {
  kind: "add_block",
  blockType: "print",
});

// Standalone "dat vao trong khoi lap" (no verb them) still resolves to the
// legacy insert_into intent so backward compat holds.
assert.deepEqual(parseVoiceIntent("dat vao trong khoi lap"), {
  kind: "insert_into",
  parentHint: "repeat",
  childHint: undefined,
});

// --- R2.2: delete_last intent ---
assert.deepEqual(parseVoiceIntent("xoa khoi cuoi"), { kind: "delete_last" });
assert.deepEqual(parseVoiceIntent("xóa khối cuối"), { kind: "delete_last" });
assert.deepEqual(parseVoiceIntent("bo khoi vua them"), { kind: "delete_last" });
assert.deepEqual(parseVoiceIntent("xoa khoi cuoi cung"), { kind: "delete_last" });
assert.deepEqual(parseVoiceIntent("xoa lenh cuoi"), { kind: "delete_last" });

// --- R2.5: edit phrases for set_text / set_number ---
assert.deepEqual(parseVoiceIntent("sửa nội dung thành Xin chào"), { kind: "set_text", text: "Xin chào" });
assert.deepEqual(parseVoiceIntent("đổi nội dung thành Bạn làm được"), {
  kind: "set_text",
  text: "Bạn làm được",
});
assert.deepEqual(parseVoiceIntent("doi chu thanh hello"), { kind: "set_text", text: "hello" });
assert.deepEqual(parseVoiceIntent("sua chu thanh world"), { kind: "set_text", text: "world" });

assert.deepEqual(parseVoiceIntent("đổi số thành 5"), { kind: "set_number", value: 5 });
assert.deepEqual(parseVoiceIntent("sua so thanh 10"), { kind: "set_number", value: 10 });
assert.deepEqual(parseVoiceIntent("đổi số lần thành 3"), { kind: "set_number", value: 3 });
assert.deepEqual(parseVoiceIntent("sua so lan thanh bon"), { kind: "set_number", value: 4 });

console.log("parse-intent tests passed");
