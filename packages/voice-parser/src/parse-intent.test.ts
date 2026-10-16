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
assert.deepEqual(parseVoiceIntent("em không biết làm gì"), { kind: "ask_hint" });
assert.deepEqual(parseVoiceIntent("làm gì tiếp"), { kind: "ask_hint" });

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
assert.deepEqual(parseVoiceIntent("xoa khoi cuoi"), { kind: "delete_block", target: "last" });
assert.deepEqual(parseVoiceIntent("xóa khối cuối"), { kind: "delete_block", target: "last" });
assert.deepEqual(parseVoiceIntent("bo khoi vua them"), { kind: "delete_block", target: "last" });
assert.deepEqual(parseVoiceIntent("xoa khoi cuoi cung"), { kind: "delete_block", target: "last" });
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

// --- Natural Vietnamese speech phrases ---
assert.deepEqual(parseVoiceIntent("cho mình thêm cái khối in nhé"), { kind: "add_block", blockType: "print" });
assert.deepEqual(parseVoiceIntent("tạo một vòng lặp"), { kind: "add_block", blockType: "repeat" });
assert.deepEqual(parseVoiceIntent("thêm câu lệnh nếu"), { kind: "add_block", blockType: "if" });
assert.deepEqual(parseVoiceIntent("hiển thị Xin chào"), { kind: "set_text", text: "Xin chào" });
assert.deepEqual(parseVoiceIntent("in ra Hello world"), { kind: "set_text", text: "Hello world" });

// --- Combo commands: add block plus field / position hints ---
assert.deepEqual(parseVoiceIntent("thêm khối lặp 5 lần"), {
  kind: "add_block",
  blockType: "repeat",
  fields: { times: 5 },
});
assert.deepEqual(parseVoiceIntent("thêm vòng lặp ba lần"), {
  kind: "add_block",
  blockType: "repeat",
  fields: { times: 3 },
});
assert.deepEqual(parseVoiceIntent("thêm khối in chữ Xin chào"), {
  kind: "add_block",
  blockType: "print",
  fields: { text: "Xin chào" },
});
assert.deepEqual(parseVoiceIntent("thêm khối in xin chào"), {
  kind: "add_block",
  blockType: "print",
  fields: { text: "xin chào" },
});
assert.deepEqual(parseVoiceIntent("thêm khối in ra Hello world"), {
  kind: "add_block",
  blockType: "print",
  fields: { text: "Hello world" },
});
assert.deepEqual(parseVoiceIntent("thêm khối in chữ Xin chào vào trong khối lặp"), {
  kind: "add_block",
  blockType: "print",
  fields: { text: "Xin chào" },
  position: { kind: "inside", parentHint: "repeat" },
});

// --- Vietnamese numbers up to 99 ---
assert.deepEqual(parseVoiceIntent("lặp lại hai mươi ba lần"), { kind: "set_number", value: 23 });
assert.deepEqual(parseVoiceIntent("đặt số lần lặp là mười lăm"), { kind: "set_number", value: 15 });
assert.deepEqual(parseVoiceIntent("đổi số thành ba mươi lăm"), { kind: "set_number", value: 35 });

// --- Smart voice cursor and confirmation ---
assert.deepEqual(parseVoiceIntent("chọn khối 1"), { kind: "select_block", target: "display_id", displayId: "1" });
assert.deepEqual(parseVoiceIntent("chọn khối 2 chấm 1"), { kind: "select_block", target: "display_id", displayId: "2.1" });
assert.deepEqual(parseVoiceIntent("chọn khối cuối"), { kind: "select_block", target: "last" });
assert.deepEqual(parseVoiceIntent("chọn khối in"), { kind: "select_block", target: "block_type", blockType: "print" });
assert.deepEqual(parseVoiceIntent("chọn khối in thứ hai"), { kind: "select_block", target: "block_type", blockType: "print", ordinal: 2 });
assert.equal(parseVoiceIntent("đặt số -1").kind, "unknown");
assert.equal(parseVoiceIntent(`đặt số ${"9".repeat(320)}`).kind, "unknown");
assert.deepEqual(parseVoiceIntent("chọn chương trình chính"), { kind: "select_block", target: "main" });
assert.deepEqual(parseVoiceIntent("chèn trước"), { kind: "set_insert_cursor", position: "before" });
assert.deepEqual(parseVoiceIntent("chèn sau"), { kind: "set_insert_cursor", position: "after" });
assert.deepEqual(parseVoiceIntent("chèn vào trong"), { kind: "set_insert_cursor", position: "inside" });
assert.deepEqual(parseVoiceIntent("thêm ở cuối"), { kind: "set_insert_cursor", position: "end" });
assert.deepEqual(parseVoiceIntent("chèn sau khối 1"), {
  kind: "set_insert_cursor",
  position: "after",
  target: "display_id",
  displayId: "1",
});
assert.deepEqual(parseVoiceIntent("chen sau khoi 1"), {
  kind: "set_insert_cursor",
  position: "after",
  target: "display_id",
  displayId: "1",
});
assert.deepEqual(parseVoiceIntent("chèn sau khối số 1"), {
  kind: "set_insert_cursor",
  position: "after",
  target: "display_id",
  displayId: "1",
});
assert.deepEqual(parseVoiceIntent("thêm sau khối 1"), {
  kind: "set_insert_cursor",
  position: "after",
  target: "display_id",
  displayId: "1",
});
assert.deepEqual(parseVoiceIntent("đặt vị trí chèn sau khối 1"), {
  kind: "set_insert_cursor",
  position: "after",
  target: "display_id",
  displayId: "1",
});
assert.deepEqual(parseVoiceIntent("chèn trước khối 2"), {
  kind: "set_insert_cursor",
  position: "before",
  target: "display_id",
  displayId: "2",
});
assert.deepEqual(parseVoiceIntent("thêm trước khối 2"), {
  kind: "set_insert_cursor",
  position: "before",
  target: "display_id",
  displayId: "2",
});
assert.deepEqual(parseVoiceIntent("chèn vào trong khối 3"), {
  kind: "set_insert_cursor",
  position: "inside",
  target: "display_id",
  displayId: "3",
});
assert.deepEqual(parseVoiceIntent("chèn trong khối 3"), {
  kind: "set_insert_cursor",
  position: "inside",
  target: "display_id",
  displayId: "3",
});
assert.deepEqual(parseVoiceIntent("đưa vào trong khối 3"), {
  kind: "set_insert_cursor",
  position: "inside",
  target: "display_id",
  displayId: "3",
});
assert.deepEqual(parseVoiceIntent("chèn sau khối 2 chấm 1"), {
  kind: "set_insert_cursor",
  position: "after",
  target: "display_id",
  displayId: "2.1",
});
assert.deepEqual(parseVoiceIntent("chèn sau khối 2.1"), {
  kind: "set_insert_cursor",
  position: "after",
  target: "display_id",
  displayId: "2.1",
});
assert.deepEqual(parseVoiceIntent("chèn sau khối cuối"), {
  kind: "set_insert_cursor",
  position: "after",
  target: "last",
});
assert.deepEqual(parseVoiceIntent("chèn trước khối cuối"), {
  kind: "set_insert_cursor",
  position: "before",
  target: "last",
});
assert.deepEqual(parseVoiceIntent("chèn sau khối đang chọn"), {
  kind: "set_insert_cursor",
  position: "after",
  target: "selected",
});
assert.deepEqual(parseVoiceIntent("chèn vào trong khối đang chọn"), {
  kind: "set_insert_cursor",
  position: "inside",
  target: "selected",
});
assert.deepEqual(parseVoiceIntent("mình đang ở đâu"), { kind: "query_position" });
assert.deepEqual(parseVoiceIntent("đang chọn gì"), { kind: "query_position" });
assert.deepEqual(parseVoiceIntent("đúng rồi"), { kind: "confirm" });
assert.deepEqual(parseVoiceIntent("đồng ý"), { kind: "confirm" });
assert.deepEqual(parseVoiceIntent("hủy"), { kind: "cancel" });
assert.deepEqual(parseVoiceIntent("bước trước"), { kind: "navigate_step", target: "previous" });
assert.deepEqual(parseVoiceIntent("về bước trước"), { kind: "navigate_step", target: "previous" });
assert.deepEqual(parseVoiceIntent("bước sau"), { kind: "navigate_step", target: "next" });
assert.deepEqual(parseVoiceIntent("đến bước 3"), { kind: "navigate_step", target: "number", stepNumber: 3 });
assert.deepEqual(parseVoiceIntent("đến bước ba"), { kind: "navigate_step", target: "number", stepNumber: 3 });
assert.deepEqual(parseVoiceIntent("chuyển đến bước 12"), { kind: "navigate_step", target: "number", stepNumber: 12 });
assert.deepEqual(parseVoiceIntent("đến bước không rõ"), { kind: "unknown", reason: "no_match" });
assert.deepEqual(parseVoiceIntent("hoàn tác"), { kind: "undo_last" });
assert.deepEqual(parseVoiceIntent("quay lại"), { kind: "undo_last" });
assert.deepEqual(parseVoiceIntent("undo"), { kind: "undo_last" });

// --- Delete, edit, move, variable output ---
assert.deepEqual(parseVoiceIntent("xóa khối 2"), { kind: "delete_block", target: "display_id", displayId: "2" });
assert.deepEqual(parseVoiceIntent("xoá khối 1"), { kind: "delete_block", target: "display_id", displayId: "1" });
assert.deepEqual(parseVoiceIntent("bỏ khối 2"), { kind: "delete_block", target: "display_id", displayId: "2" });
assert.deepEqual(parseVoiceIntent("xóa"), { kind: "delete_block", target: "selected" });
assert.deepEqual(parseVoiceIntent("xóa khối"), { kind: "delete_block", target: "selected" });
assert.deepEqual(parseVoiceIntent("xóa cái này"), { kind: "delete_block", target: "selected" });
assert.deepEqual(parseVoiceIntent("bỏ khối này"), { kind: "delete_block", target: "selected" });
assert.deepEqual(parseVoiceIntent("bỏ cái vừa rồi"), { kind: "delete_block", target: "last" });
assert.deepEqual(parseVoiceIntent("xóa khối đang chọn"), { kind: "delete_block", target: "selected" });
assert.deepEqual(parseVoiceIntent("di chuyển khối 4 lên trên"), {
  kind: "move_block",
  target: "display_id",
  displayId: "4",
  direction: "up",
});
assert.deepEqual(parseVoiceIntent("di chuyển khối này xuống dưới"), {
  kind: "move_block",
  target: "selected",
  direction: "down",
});
assert.deepEqual(parseVoiceIntent("đưa khối này ra ngoài"), {
  kind: "move_block",
  target: "selected",
  direction: "outside",
});
assert.deepEqual(parseVoiceIntent("đưa khối 4 vào trong khối 3"), {
  kind: "move_block",
  target: "display_id",
  displayId: "4",
  direction: "inside",
  parentDisplayId: "3",
});
assert.deepEqual(parseVoiceIntent("in biến điểm"), { kind: "set_variable_output", name: "diem" });
assert.deepEqual(parseVoiceIntent("hiển thị biến điểm"), { kind: "set_variable_output", name: "diem" });
assert.deepEqual(parseVoiceIntent("in giá trị điểm"), { kind: "set_variable_output", name: "diem" });
assert.deepEqual(parseVoiceIntent("thêm khối in biến điểm"), {
  kind: "add_block",
  blockType: "print",
  fields: { variableName: "diem" },
});
assert.deepEqual(parseVoiceIntent("cho bạn ấy nói xin chào"), { kind: "set_text", text: "xin chào" });
assert.deepEqual(parseVoiceIntent("nói xin chào"), { kind: "set_text", text: "xin chào" });
assert.deepEqual(parseVoiceIntent("kiểm tra bài"), { kind: "check_work" });
assert.deepEqual(parseVoiceIntent("giải thích khối này"), { kind: "explain_block" });

// --- Blockly workspace viewport commands ---
assert.deepEqual(parseVoiceIntent("cuộn lên"), { kind: "pan_workspace", direction: "up" });
assert.deepEqual(parseVoiceIntent("cuộn xuống"), { kind: "pan_workspace", direction: "down" });
assert.deepEqual(parseVoiceIntent("cuộn sang trái"), { kind: "pan_workspace", direction: "left" });
assert.deepEqual(parseVoiceIntent("cuộn sang phải"), { kind: "pan_workspace", direction: "right" });
assert.deepEqual(parseVoiceIntent("keo len"), { kind: "pan_workspace", direction: "up" });
assert.deepEqual(parseVoiceIntent("qua phải"), { kind: "pan_workspace", direction: "right" });
assert.deepEqual(parseVoiceIntent("về giữa"), { kind: "center_workspace", target: "workspace" });
assert.deepEqual(parseVoiceIntent("căn giữa workspace"), { kind: "center_workspace", target: "workspace" });
assert.deepEqual(parseVoiceIntent("đưa khối đang chọn về giữa"), { kind: "center_workspace", target: "selected_block" });
assert.deepEqual(parseVoiceIntent("đưa khối 2 về giữa"), { kind: "center_workspace", target: "display_id", displayId: "2" });
assert.deepEqual(parseVoiceIntent("vừa màn hình"), { kind: "zoom_workspace", level: "fit" });
assert.deepEqual(parseVoiceIntent("hiển thị toàn bộ chương trình"), { kind: "zoom_workspace", level: "fit" });
assert.deepEqual(parseVoiceIntent("phóng to"), { kind: "zoom_workspace", level: "in" });
assert.deepEqual(parseVoiceIntent("thu nhỏ"), { kind: "zoom_workspace", level: "out" });
assert.deepEqual(parseVoiceIntent("đặt lại zoom"), { kind: "zoom_workspace", level: "reset" });

// --- Blockly toolbox commands ---
assert.deepEqual(parseVoiceIntent("mở danh sách khối"), { kind: "set_toolbox_visibility", visible: true });
assert.deepEqual(parseVoiceIntent("mở danh sách"), { kind: "set_toolbox_visibility", visible: true });
assert.deepEqual(parseVoiceIntent("thu gọn danh sách khối"), { kind: "set_toolbox_visibility", visible: false });
assert.deepEqual(parseVoiceIntent("thu gọn danh sách"), { kind: "set_toolbox_visibility", visible: false });
assert.deepEqual(parseVoiceIntent("đóng danh sách khối"), { kind: "set_toolbox_visibility", visible: false });
assert.deepEqual(parseVoiceIntent("mở nhóm luồng"), { kind: "open_toolbox_category", category: "flow" });
assert.deepEqual(parseVoiceIntent("xem nhóm luồng"), { kind: "open_toolbox_category", category: "flow" });
assert.deepEqual(parseVoiceIntent("mở nhóm đầu ra"), { kind: "open_toolbox_category", category: "output" });
assert.deepEqual(parseVoiceIntent("mở danh sách khối đầu ra"), { kind: "open_toolbox_category", category: "output" });
assert.deepEqual(parseVoiceIntent("mở nhóm khối đầu ra"), { kind: "open_toolbox_category", category: "output" });
assert.deepEqual(parseVoiceIntent("mở nhóm lặp"), { kind: "open_toolbox_category", category: "loop" });
assert.deepEqual(parseVoiceIntent("mở danh sách khối lặp"), { kind: "open_toolbox_category", category: "loop" });
assert.deepEqual(parseVoiceIntent("mở nhóm điều kiện"), { kind: "open_toolbox_category", category: "condition" });
assert.deepEqual(parseVoiceIntent("mở nhóm giá trị"), { kind: "open_toolbox_category", category: "value" });
assert.deepEqual(parseVoiceIntent("mở nhóm biến"), { kind: "open_toolbox_category", category: "variable" });
// --- Step navigation commands ---
assert.deepEqual(parseVoiceIntent("bước sau"), { kind: "navigate_step", target: "next" });
assert.deepEqual(parseVoiceIntent("sang bước sau"), { kind: "navigate_step", target: "next" });
assert.deepEqual(parseVoiceIntent("tiếp tục"), { kind: "navigate_step", target: "next" });
assert.deepEqual(parseVoiceIntent("tiếp theo"), { kind: "navigate_step", target: "next" });
assert.deepEqual(parseVoiceIntent("bước tiếp"), { kind: "navigate_step", target: "next" });
assert.deepEqual(parseVoiceIntent("bước tiếp theo"), { kind: "navigate_step", target: "next" });
assert.deepEqual(parseVoiceIntent("sang bước tiếp theo"), { kind: "navigate_step", target: "next" });
assert.deepEqual(parseVoiceIntent("bước trước"), { kind: "navigate_step", target: "previous" });
assert.deepEqual(parseVoiceIntent("về bước trước"), { kind: "navigate_step", target: "previous" });
assert.deepEqual(parseVoiceIntent("quay lại bước trước"), { kind: "navigate_step", target: "previous" });

console.log("parse-intent tests passed");
