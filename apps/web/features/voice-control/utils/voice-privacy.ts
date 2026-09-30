export const VOICE_PROCESSING_NOTICE_KEY = "scc_voice_processing_notice_v2";

export const VOICE_PROCESSING_DISCLOSURE =
  "Micro được dùng để nhận dạng giọng nói. Tùy cấu hình, âm thanh có thể được xử lý bởi Groq hoặc máy chủ nhận dạng của SAYNTAX; khi dùng dự phòng, trình duyệt có thể gửi âm thanh tới dịch vụ giọng nói của nhà cung cấp trình duyệt. SAYNTAX không giữ lại âm thanh thô sau khi xử lý. Trong bài học, lưu câu lệnh đã nhận dạng hoặc nhập vào là lựa chọn riêng, mặc định tắt.";

export function hasAcknowledgedVoiceProcessing(storage: Pick<Storage, "getItem">) {
  return storage.getItem(VOICE_PROCESSING_NOTICE_KEY) === "true";
}

export function acknowledgeVoiceProcessing(storage: Pick<Storage, "setItem">) {
  storage.setItem(VOICE_PROCESSING_NOTICE_KEY, "true");
}

export function canStartVoiceRecognition(isSupportKnown: boolean, isSupported: boolean, acknowledged: boolean) {
  return isSupportKnown && isSupported && acknowledged;
}

export function shouldPersistVoiceCommandLog(mode: "authenticated" | "demo", loggingEnabled: boolean) {
  return mode === "authenticated" && loggingEnabled;
}
