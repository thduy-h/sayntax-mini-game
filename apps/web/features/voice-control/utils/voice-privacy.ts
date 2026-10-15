export const VOICE_PROCESSING_NOTICE_KEY = "scc_voice_processing_notice_v2";

export const VOICE_PROCESSING_DISCLOSURE =
  "Micro được dùng để nhận dạng giọng nói. Tùy cấu hình, âm thanh có thể được xử lý bởi nhà cung cấp nhận dạng trên đám mây hoặc máy vận hành tại workshop; khi dùng dự phòng, trình duyệt có thể gửi âm thanh tới dịch vụ giọng nói của nhà cung cấp trình duyệt. SAYNTAX không giữ lại âm thanh thô sau khi xử lý. Trong bài học, lưu câu lệnh đã nhận dạng hoặc nhập vào là lựa chọn riêng, mặc định tắt.";

export function hasAcknowledgedVoiceProcessing(storage: Pick<Storage, "getItem">) {
  try {
    return storage.getItem(VOICE_PROCESSING_NOTICE_KEY) === "true";
  } catch {
    return false;
  }
}

export function acknowledgeVoiceProcessing(storage: Pick<Storage, "setItem">) {
  try {
    storage.setItem(VOICE_PROCESSING_NOTICE_KEY, "true");
  } catch {
    // Consent remains valid for this session when browser storage is unavailable.
  }
}

export function canStartVoiceRecognition(isSupportKnown: boolean, isSupported: boolean, acknowledged: boolean) {
  return isSupportKnown && isSupported && acknowledged;
}

export function shouldPersistVoiceCommandLog(mode: "authenticated" | "demo", loggingEnabled: boolean) {
  return mode === "authenticated" && loggingEnabled;
}
