import type { ASREngine, ASREngineCallbacks } from "./types";
import { logASR } from "./config";
import { isLikelyLocalASRHallucination } from "./local-transcript-filter";

interface ServerASREngineOptions {
  selectedDeviceId: () => string;
}

interface ServerTranscribeResponse {
  provider: "groq" | "local";
  text: string;
}

interface QueuedAudioSegment {
  blob: Blob;
  mimeType: string;
}

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"] as const;
const MAX_RECORDING_MS = 5500;
const MIN_RECORDING_MS = 450;
const RESTART_AFTER_SEGMENT_MS = 120;
const SILENCE_AFTER_SPEECH_MS = 900;
const SPEECH_RMS_THRESHOLD = 0.012;
const TRANSCRIBE_TIMEOUT_MS = 25_000;

function chooseMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export class ServerASREngine implements ASREngine {
  readonly type = "server" as const;
  private callbacks: ASREngineCallbacks;
  private chunks: Blob[] = [];
  private controller: AbortController | null = null;
  private audioContext: AudioContext | null = null;
  private hasHeardSpeech = false;
  private isTranscribing = false;
  private maxTimer: number | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mimeType = "";
  private options: ServerASREngineOptions;
  private pendingSegments: QueuedAudioSegment[] = [];
  private recordingStartedAt = 0;
  private restartTimer: number | null = null;
  private silenceFrameId: number | null = null;
  private silenceStartedAt: number | null = null;
  private shouldContinue = false;
  private stream: MediaStream | null = null;

  constructor(options: ServerASREngineOptions, callbacks: ASREngineCallbacks) {
    this.callbacks = callbacks;
    this.options = options;
  }

  isSupported() {
    return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";
  }

  async start() {
    if (this.mediaRecorder?.state === "recording") return;
    this.shouldContinue = true;
    await this.startSegment();
  }

  private async startSegment() {
    if (!this.shouldContinue) return;
    if (this.mediaRecorder?.state === "recording") return;
    if (!this.isSupported()) {
      this.shouldContinue = false;
      this.callbacks.onError?.({
        code: "not_supported",
        message: "Trình duyệt chưa hỗ trợ thu âm cho nhận dạng giọng nói.",
        recoverable: false,
      });
      return;
    }

    if (!this.stream) {
      this.callbacks.onStateChange?.("starting");
      const selectedDeviceId = this.options.selectedDeviceId();
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
            ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}),
          },
        });
        this.startSilenceDetection(this.stream);
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        this.shouldContinue = false;
        this.callbacks.onError?.({
          code:
            name === "NotAllowedError" || name === "SecurityError"
              ? "permission_denied"
              : name === "NotFoundError" || name === "DevicesNotFoundError"
                ? "microphone_missing"
                : name === "NotReadableError" || name === "TrackStartError"
                  ? "microphone_busy"
                  : "unknown",
          message:
            name === "NotAllowedError" || name === "SecurityError"
              ? "Trang này chưa được cấp quyền micro. Hãy bật quyền Microphone trong trình duyệt."
              : name === "NotFoundError" || name === "DevicesNotFoundError"
                ? "Không tìm thấy micro. Hãy kiểm tra thiết bị đầu vào."
                : "Không mở được micro. Hãy đóng ứng dụng khác đang dùng micro rồi thử lại.",
          recoverable: name !== "NotAllowedError" && name !== "SecurityError",
        });
        this.callbacks.onStateChange?.("stopped");
        return;
      }
    }

    this.mimeType = chooseMimeType();
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream, this.mimeType ? { mimeType: this.mimeType } : undefined);
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.mediaRecorder.onerror = () => {
      this.callbacks.onError?.({
        code: "unknown",
        message: "Không thu được âm thanh từ micro.",
        recoverable: true,
      });
    };
    this.mediaRecorder.onstop = () => {
      this.queueStoppedSegment();
    };
    this.mediaRecorder.start();
    this.recordingStartedAt = performance.now();
    this.hasHeardSpeech = false;
    this.silenceStartedAt = null;
    this.callbacks.onStateChange?.("listening");
    logASR("Recording started");
    this.maxTimer = window.setTimeout(() => {
      this.stopCurrentSegment();
    }, MAX_RECORDING_MS);
  }

  async stop() {
    this.shouldContinue = false;
    this.controller?.abort();
    if (this.restartTimer !== null) {
      window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.stopCurrentSegment({ final: true });
  }

  private stopCurrentSegment(options: { final?: boolean } = {}) {
    if (this.maxTimer !== null) {
      window.clearTimeout(this.maxTimer);
      this.maxTimer = null;
    }
    if (options.final) this.stopSilenceDetection();
    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.stop();
      return;
    }
    if (options.final) this.stopTracks();
    this.callbacks.onStateChange?.("stopped");
  }

  private queueStoppedSegment() {
    const mimeType = this.mediaRecorder?.mimeType || this.mimeType || "audio/webm";
    const blob = new Blob(this.chunks, { type: mimeType });
    this.chunks = [];
    this.mediaRecorder = null;
    logASR(`Segment stopped: ${Math.round(blob.size / 1024)}KB, continue=${this.shouldContinue ? "yes" : "no"}`);
    if (blob.size > 0) {
      this.pendingSegments.push({ blob, mimeType });
      void this.processQueue();
    } else if (!this.shouldContinue) {
      this.callbacks.onError?.({
        code: "no_speech",
        message: "Không nghe rõ câu lệnh. Hãy thử nói lại.",
        recoverable: true,
      });
    }
    this.finishRecordingSegment();
  }

  private async processQueue() {
    if (this.isTranscribing) return;
    this.isTranscribing = true;
    try {
      while (this.pendingSegments.length > 0) {
        const segment = this.pendingSegments.shift();
        if (!segment) continue;
        if (this.mediaRecorder?.state !== "recording") this.callbacks.onStateChange?.("processing");
        this.controller = new AbortController();
        const form = new FormData();
        form.append("file", segment.blob, `speech.${segment.mimeType.includes("ogg") ? "ogg" : "webm"}`);
        try {
          logASR("Sending audio to SAYNTAX ASR");
          let requestTimedOut = false;
          const requestTimer = window.setTimeout(() => {
            requestTimedOut = true;
            this.controller?.abort();
          }, TRANSCRIBE_TIMEOUT_MS);
          let response: Response;
          try {
            response = await fetch("/api/asr/transcribe", {
              body: form,
              headers: { "X-ASR-Provider": "groq" },
              method: "POST",
              signal: this.controller.signal,
            });
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError" && !requestTimedOut) throw error;
            throw new ASRRequestError(true);
          } finally {
            window.clearTimeout(requestTimer);
          }
          if (!response.ok) throw new ASRRequestError(response.status === 429 || response.status >= 500);
          const data = (await response.json()) as ServerTranscribeResponse;
          const text = data.text.trim();
          if (!text || isLikelyLocalASRHallucination(text)) {
            if (!this.shouldContinue && this.mediaRecorder?.state !== "recording") {
              this.callbacks.onError?.({
                code: "no_speech",
                message: "Hệ thống chưa nhận ra câu lệnh. Hãy thử nói lại.",
                recoverable: true,
              });
            }
          } else {
            logASR("Transcript received");
            this.callbacks.onFinalResult?.({
              alternatives: [{ confidence: 1, transcript: text }],
              engine: data.provider === "groq" ? "cloud" : "local",
              text,
            });
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") break;
          this.shouldContinue = false;
          this.pendingSegments = [];
          const asrError = {
            code: error instanceof ASRRequestError && error.allowFallback ? "upstream_unavailable" : "transcribe_failed",
            message: error instanceof ASRRequestError && error.allowFallback
              ? "Dịch vụ nhận dạng tạm thời không phản hồi. Đã chuyển sang nhận dạng của trình duyệt."
              : "Hệ thống chưa xử lý được đoạn vừa nói. Hãy thử lại.",
            recoverable: true,
          } as const;
          this.stopBeforeReportingError(() => this.callbacks.onError?.(asrError));
          break;
        } finally {
          this.controller = null;
        }
      }
    } finally {
      this.isTranscribing = false;
      if (this.mediaRecorder?.state === "recording") this.callbacks.onStateChange?.("listening");
    }
  }

  private finishRecordingSegment() {
    if (!this.shouldContinue) {
      this.stopTracks();
      this.callbacks.onStateChange?.("stopped");
      return;
    }
    this.callbacks.onStateChange?.("starting");
    logASR("Scheduling next recording segment");
    this.scheduleNextSegment();
  }

  private stopBeforeReportingError(report: () => void) {
    if (this.maxTimer !== null) window.clearTimeout(this.maxTimer);
    if (this.restartTimer !== null) window.clearTimeout(this.restartTimer);
    this.maxTimer = null;
    this.restartTimer = null;
    this.stopSilenceDetection();
    const recorder = this.mediaRecorder;
    if (recorder?.state === "recording") {
      recorder.ondataavailable = null;
      recorder.onstop = () => {
        this.chunks = [];
        this.mediaRecorder = null;
        this.stopTracks();
        this.callbacks.onStateChange?.("stopped");
        report();
      };
      recorder.stop();
      return;
    }
    this.stopTracks();
    this.callbacks.onStateChange?.("stopped");
    report();
  }

  private scheduleNextSegment() {
    if (this.restartTimer !== null) window.clearTimeout(this.restartTimer);
    this.restartTimer = window.setTimeout(() => {
      this.restartTimer = null;
      void this.startSegment();
    }, RESTART_AFTER_SEGMENT_MS);
  }

  private stopTracks() {
    this.stopSilenceDetection();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.mediaRecorder = null;
  }

  private startSilenceDetection(stream: MediaStream) {
    if (typeof AudioContext === "undefined") return;
    if (this.audioContext) return;
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const value of samples) {
          const centered = (value - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / samples.length);
        const now = performance.now();
        if (this.mediaRecorder?.state !== "recording") {
          this.silenceFrameId = window.requestAnimationFrame(tick);
          return;
        }
        if (rms >= SPEECH_RMS_THRESHOLD) {
          this.hasHeardSpeech = true;
          this.silenceStartedAt = null;
        } else if (this.hasHeardSpeech) {
          this.silenceStartedAt ??= now;
          const longEnough = now - this.recordingStartedAt >= MIN_RECORDING_MS;
          if (longEnough && now - this.silenceStartedAt >= SILENCE_AFTER_SPEECH_MS) {
            this.stopCurrentSegment();
            return;
          }
        }
        this.silenceFrameId = window.requestAnimationFrame(tick);
      };
      this.silenceFrameId = window.requestAnimationFrame(tick);
    } catch {
      this.stopSilenceDetection();
    }
  }

  private stopSilenceDetection() {
    if (this.silenceFrameId !== null) {
      window.cancelAnimationFrame(this.silenceFrameId);
      this.silenceFrameId = null;
    }
    void this.audioContext?.close();
    this.audioContext = null;
    this.silenceStartedAt = null;
  }

  dispose() {
    this.shouldContinue = false;
    this.isTranscribing = false;
    if (this.maxTimer !== null) window.clearTimeout(this.maxTimer);
    if (this.restartTimer !== null) window.clearTimeout(this.restartTimer);
    this.stopSilenceDetection();
    this.controller?.abort();
    if (this.mediaRecorder?.state === "recording") {
      try {
        this.mediaRecorder.stop();
      } catch {
        // recorder may already be stopped
      }
    }
    this.chunks = [];
    this.stopTracks();
  }
}

class ASRRequestError extends Error {
  constructor(readonly allowFallback: boolean) {
    super("ASR request failed");
  }
}
