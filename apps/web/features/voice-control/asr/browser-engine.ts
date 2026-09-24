import { getSpeechRecognitionPhrases } from "@shecancode/voice-parser";
import type { ASRAlternative, ASREngine, ASREngineCallbacks } from "./types";

interface SpeechRecognitionAlternativeLike {
  confidence?: number;
  transcript: string;
}

interface SpeechRecognitionResultLike {
  [index: number]: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
}

interface SpeechRecognitionInstance {
  abort?: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  phrases?: Array<{ boost: number; phrase: string }>;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function applySpeechRecognitionPhrases(recognition: SpeechRecognitionInstance) {
  if (!("phrases" in recognition)) return;
  try {
    recognition.phrases = getSpeechRecognitionPhrases().slice(0, 80).map((phrase) => ({ boost: 8, phrase }));
  } catch {
    // Experimental in Chromium. If conversion fails, recognition still works.
  }
}

function errorMessage(error: string) {
  return {
    aborted: "Đã dừng nhận dạng giọng nói.",
    "audio-capture": "Trình duyệt không lấy được âm thanh từ micro. Hãy kiểm tra thiết bị đầu vào.",
    network: "Dịch vụ nhận dạng giọng nói của trình duyệt chưa phản hồi. Hãy thử Edge hoặc Chrome.",
    "no-speech": "Không nhận diện được giọng nói. Hãy thử nói lại chậm hơn.",
    "not-allowed": "Trang này chưa được cấp quyền micro. Hãy bật quyền Microphone trong trình duyệt.",
    "service-not-allowed": "Dịch vụ nhận dạng giọng nói bị trình duyệt chặn. Hãy thử Edge hoặc Chrome.",
  }[error] ?? "Không thể nhận dạng giọng nói bằng trình duyệt.";
}

export class BrowserSpeechRecognitionEngine implements ASREngine {
  readonly type = "browser" as const;
  private callbacks: ASREngineCallbacks;
  private recognition: SpeechRecognitionInstance | null = null;
  private started = false;

  constructor(callbacks: ASREngineCallbacks) {
    this.callbacks = callbacks;
  }

  isSupported() {
    return typeof window !== "undefined" && Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);
  }

  async start() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      this.callbacks.onError?.({
        code: "not_supported",
        message: "Trình duyệt này chưa hỗ trợ nhận dạng giọng nói. Hãy thử Edge hoặc Chrome.",
        recoverable: false,
      });
      this.callbacks.onStateChange?.("unavailable");
      return;
    }
    if (this.started) return;

    const recognition = new Recognition();
    recognition.lang = "vi-VN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    applySpeechRecognitionPhrases(recognition);

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const first = result?.[0]?.transcript?.trim() ?? "";
        if (!first) continue;
        if (result.isFinal) {
          const alternatives: ASRAlternative[] = Array.from({ length: Math.min(result.length, 3) }, (_, index) => result[index])
            .map((alternative) => ({
              confidence: alternative.confidence,
              transcript: alternative.transcript.trim(),
            }))
            .filter((alternative) => alternative.transcript);
          this.callbacks.onFinalResult?.({
            alternatives,
            engine: "browser",
            text: alternatives[0]?.transcript ?? first,
          });
          interim = "";
        } else {
          interim = `${interim} ${first}`.trim();
        }
      }
      this.callbacks.onInterimResult?.(interim);
    };

    recognition.onerror = (event) => {
      this.started = false;
      this.callbacks.onStateChange?.("stopped");
      this.callbacks.onError?.({
        code:
          event.error === "not-allowed"
            ? "permission_denied"
            : event.error === "audio-capture"
              ? "microphone_busy"
              : event.error === "no-speech"
                ? "no_speech"
                : event.error === "network" || event.error === "service-not-allowed"
                  ? "network"
                  : event.error === "aborted"
                    ? "aborted"
                    : "unknown",
        message: errorMessage(event.error),
        recoverable: event.error !== "not-allowed",
      });
    };

    recognition.onend = () => {
      this.started = false;
      this.callbacks.onInterimResult?.("");
      this.callbacks.onStateChange?.("stopped");
    };

    this.recognition = recognition;
    this.callbacks.onStateChange?.("starting");
    try {
      recognition.start();
      this.started = true;
      this.callbacks.onStateChange?.("listening");
    } catch {
      this.started = false;
      this.callbacks.onError?.({
        code: "unknown",
        message: "Trình duyệt chưa sẵn sàng mở nhận dạng giọng nói. Hãy bấm Dừng rồi thử lại.",
        recoverable: true,
      });
      this.callbacks.onStateChange?.("stopped");
    }
  }

  async stop() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch {
      this.recognition.abort?.();
    }
    this.started = false;
    this.callbacks.onStateChange?.("stopped");
  }

  dispose() {
    try {
      this.recognition?.abort?.();
      this.recognition?.stop();
    } catch {
      // cleanup race is harmless
    }
    this.recognition = null;
    this.started = false;
  }
}
