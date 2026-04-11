import assert from "node:assert/strict";

import {
  describeIntent,
  deriveSampleUtterance,
  extractSampleFromInstructions,
  splitBoldSegments,
} from "./intent-display";

// --- describeIntent ---
assert.equal(describeIntent({ kind: "add_block", blockType: "print" }), "thêm khối in");
assert.equal(describeIntent({ kind: "add_block", blockType: "repeat" }), "thêm khối lặp");
assert.equal(
  describeIntent({
    kind: "add_block",
    blockType: "print",
    position: { kind: "inside", parentHint: "repeat" },
  }),
  "thêm khối in vào trong khối lặp",
);
assert.equal(
  describeIntent({
    kind: "add_block",
    blockType: "print",
    position: { kind: "inside", parentHint: "if" },
  }),
  "thêm khối in vào trong khối điều kiện",
);
assert.equal(describeIntent({ kind: "insert_into", parentHint: "repeat" }), "đặt vào trong khối lặp");
assert.equal(describeIntent({ kind: "insert_into" }), "đặt vào trong khối cha");
assert.equal(describeIntent({ kind: "set_text", text: "Xin chào" }), 'đặt chữ "Xin chào"');
assert.equal(describeIntent({ kind: "set_number", value: 5 }), "đặt số 5");
assert.equal(describeIntent({ kind: "delete_last" }), "xoá khối cuối");
assert.equal(describeIntent({ kind: "run_program" }), "chạy chương trình");
assert.equal(describeIntent({ kind: "ask_hint" }), "mở gợi ý");
assert.equal(describeIntent({ kind: "unknown", reason: "no_match" }), "chưa hiểu câu lệnh");

// --- extractSampleFromInstructions ---
assert.equal(
  extractSampleFromInstructions("Hãy nói: **Thêm khối bắt đầu** để tạo điểm khởi động."),
  "Thêm khối bắt đầu",
);
assert.equal(
  extractSampleFromInstructions("Chọn khối in rồi hãy nói: **Đặt chữ Xin chào** để nhập nội dung."),
  "Đặt chữ Xin chào",
);
assert.equal(
  extractSampleFromInstructions("Bạn sẵn sàng rồi! Hãy nói câu lệnh phù hợp để chạy chương trình."),
  null,
);
assert.equal(extractSampleFromInstructions(""), null);

// --- deriveSampleUtterance ---
assert.equal(deriveSampleUtterance({ kind: "add_block", blockType: "print" }), "Thêm khối in");
assert.equal(
  deriveSampleUtterance({ kind: "add_block", blockType: "repeat" }),
  "Thêm khối lặp",
);
assert.equal(
  deriveSampleUtterance({
    kind: "insert_into",
    parentBlockType: "repeat",
    childBlockType: "print",
  }),
  "Thêm khối in vào trong khối lặp",
);
assert.equal(
  deriveSampleUtterance({
    kind: "set_text",
    blockId: "foo",
    field: "text",
    expectedText: "Xin chào",
  }),
  "Đặt chữ Xin chào",
);
assert.equal(
  deriveSampleUtterance({
    kind: "set_number",
    blockId: "foo",
    field: "times",
    expectedNumber: 3,
  }),
  "Đặt số 3",
);
assert.equal(
  deriveSampleUtterance({ kind: "run_program", expectedOutput: ["Xin chào"] }),
  "Chạy chương trình",
);
assert.equal(deriveSampleUtterance({ kind: "ask_hint" }), "Xin gợi ý");

// --- splitBoldSegments ---
assert.deepEqual(splitBoldSegments("Hãy nói: **Thêm khối in** để chuẩn bị."), [
  { text: "Hãy nói: ", bold: false },
  { text: "Thêm khối in", bold: true },
  { text: " để chuẩn bị.", bold: false },
]);
assert.deepEqual(splitBoldSegments("Plain text with no bold"), [
  { text: "Plain text with no bold", bold: false },
]);
assert.deepEqual(splitBoldSegments("**Only bold**"), [{ text: "Only bold", bold: true }]);
assert.deepEqual(splitBoldSegments(""), []);
assert.deepEqual(splitBoldSegments("A **one** and **two** ok"), [
  { text: "A ", bold: false },
  { text: "one", bold: true },
  { text: " and ", bold: false },
  { text: "two", bold: true },
  { text: " ok", bold: false },
]);

console.log("intent-display tests passed");
