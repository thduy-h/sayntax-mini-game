import assert from "node:assert/strict";
import {
  commandFeedbackAnnouncement,
  conciseAnnouncement,
  distinctAnnouncement,
  programResultAnnouncement,
  speechStatusAnnouncement,
  type SpeechAnnouncementState,
} from "./accessible-announcements";

const checking: SpeechAnnouncementState = { errorMessage: null, isListening: false, isSupportKnown: false, isSupported: false };
const ready: SpeechAnnouncementState = { ...checking, isSupportKnown: true, isSupported: true };
const listening: SpeechAnnouncementState = { ...ready, isListening: true };
const stopped: SpeechAnnouncementState = { ...ready, isListening: false };

assert.equal(speechStatusAnnouncement(null, checking, "Dùng ô nhập lệnh."), null);
assert.equal(speechStatusAnnouncement(checking, ready, "Dùng ô nhập lệnh."), null);
assert.equal(speechStatusAnnouncement(ready, listening, "Dùng ô nhập lệnh."), "Micro đang nghe.");
assert.equal(speechStatusAnnouncement(listening, listening, "Dùng ô nhập lệnh."), null);
assert.equal(speechStatusAnnouncement(listening, stopped, "Dùng ô nhập lệnh."), "Đã dừng nghe.");
assert.equal(speechStatusAnnouncement(ready, { ...ready, errorMessage: "Không nghe rõ." }, "Dùng ô nhập lệnh."), "Không nghe rõ. Dùng ô nhập lệnh.");
assert.equal(speechStatusAnnouncement(ready, { ...ready, isSupported: false }, "Dùng ô nhập lệnh."), "Nhận dạng giọng nói không khả dụng. Dùng ô nhập lệnh.");
assert.equal(speechStatusAnnouncement({ ...ready, errorMessage: "Lỗi." }, { ...ready, errorMessage: "Lỗi." }, "Dùng ô nhập lệnh."), null);

assert.equal(commandFeedbackAnnouncement({ feedback: "Đã xử lý: thêm khối in." }), "Đã xử lý: thêm khối in.");
assert.equal(commandFeedbackAnnouncement({ feedback: "Mình chưa hiểu câu lệnh này." }), "Mình chưa hiểu câu lệnh này.");
assert.equal(commandFeedbackAnnouncement({ feedback: "Đã xử lý.", pendingPreview: "Xóa khối? Nói đúng rồi hoặc hủy." }), "Xóa khối? Nói đúng rồi hoặc hủy.");
assert.equal(conciseAnnouncement("Đã nghe: “tên riêng”. Mình chưa đủ chắc."), "Hệ thống chưa chắc câu lệnh. Hãy nói lại rõ hơn hoặc thử câu khác.");
assert.equal(conciseAnnouncement("Đang nghe: " + "x".repeat(300)).length <= 221, true);
assert.equal(programResultAnnouncement({ success: true, output: ["Xin chào", "dòng 2"], errors: [], variables: {} }, "Bước đã hoàn thành."), "Bước đã hoàn thành. Đầu ra: Xin chào.");
assert.equal(programResultAnnouncement({ success: false, output: [], errors: ["Sai cú pháp"], variables: {} }, null), "Chương trình chạy lỗi. Sai cú pháp");
assert.equal(distinctAnnouncement("Đã dừng nghe.", "Đã dừng nghe."), null);
assert.equal(distinctAnnouncement("Đã dừng nghe.", "Đã dừng nghe.", true), "Đã dừng nghe.");
assert.equal(distinctAnnouncement("Đã dừng nghe.", "Micro đang nghe."), "Micro đang nghe.");

console.log("accessible-announcements tests passed");
