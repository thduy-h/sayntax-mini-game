import { getASRConfig, logASR } from "./config";
import { BrowserSpeechRecognitionEngine } from "./browser-engine";
import { checkLocalASRHealth } from "./local-health";
import { LocalASREngine } from "./local-engine";
import type { ASREngine, ASREngineCallbacks, ASREngineType, ASRMode, ASRState, LocalASRHealth } from "./types";

interface HybridASRManagerOptions {
  callbacks: ASREngineCallbacks;
  selectedDeviceId: () => string;
}

export class HybridASRManager {
  private activeEngine: ASREngine | null = null;
  private browserEngine: BrowserSpeechRecognitionEngine;
  private callbacks: ASREngineCallbacks;
  private config = getASRConfig();
  private engineType: ASREngineType = "unavailable";
  private localHealth: LocalASRHealth | null = null;
  private localUrl = this.config.localUrl;
  private mode: ASRMode = this.config.mode;
  private selectedDeviceId: () => string;
  private state: ASRState = "checking";

  constructor(options: HybridASRManagerOptions) {
    this.callbacks = options.callbacks;
    this.selectedDeviceId = options.selectedDeviceId;
    this.browserEngine = new BrowserSpeechRecognitionEngine(this.wrapCallbacks("browser"));
  }

  getEngineType() {
    return this.engineType;
  }

  getEngineLabel() {
    if (this.engineType === "local") {
      const detail = this.localHealth ? ` (${this.localHealth.model}, ${this.localHealth.device})` : "";
      return `Local AI${detail}`;
    }
    if (this.engineType === "browser") return "Nhận dạng của trình duyệt";
    return "Không khả dụng";
  }

  getState() {
    return this.state;
  }

  isSupported() {
    return this.engineType !== "unavailable";
  }

  async initialize(options: { forceLocalCheck?: boolean } = {}) {
    this.setState("checking");
    if (this.mode !== "browser") {
      this.localHealth = await checkLocalASRHealth(this.localUrl, this.config.healthTimeoutMs, {
        force: options.forceLocalCheck,
      });
      if (this.localHealth) {
        this.setActiveEngine("local");
        this.setState("stopped");
        return;
      }
      if (this.mode === "local") {
        this.setActiveEngine("unavailable");
        this.callbacks.onError?.({
          code: "network",
          message: "Không tìm thấy ASR local. Hãy bật server local hoặc đổi cấu hình sang browser.",
          recoverable: true,
        });
        this.setState("unavailable");
        return;
      }
    }

    if (this.browserEngine.isSupported()) {
      this.setActiveEngine("browser");
      this.setState("stopped");
      return;
    }
    this.setActiveEngine("unavailable");
    this.callbacks.onError?.({
      code: "not_supported",
      message: "Trình duyệt này chưa hỗ trợ nhận dạng giọng nói. Hãy thử Edge hoặc Chrome, hoặc bật ASR local.",
      recoverable: false,
    });
    this.setState("unavailable");
  }

  async retryLocal() {
    if (this.state === "listening" || this.state === "processing" || this.state === "starting") return;
    await this.initialize({ forceLocalCheck: true });
  }

  async start() {
    if (!this.activeEngine) await this.initialize();
    if (!this.activeEngine || this.engineType === "unavailable") return;
    window.speechSynthesis?.cancel();
    await this.activeEngine.start();
  }

  async stop() {
    await this.activeEngine?.stop();
  }

  dispose() {
    this.activeEngine?.dispose();
    this.browserEngine.dispose();
  }

  private wrapCallbacks(engine: ASREngineType): ASREngineCallbacks {
    return {
      onError: (error) => {
        this.callbacks.onError?.(error);
        if (engine === "local" && error.code === "transcribe_failed" && this.mode === "auto") {
          this.setActiveEngine(this.browserEngine.isSupported() ? "browser" : "unavailable");
        }
      },
      onFinalResult: this.callbacks.onFinalResult,
      onInterimResult: this.callbacks.onInterimResult,
      onStateChange: (state) => this.setState(state),
    };
  }

  private setActiveEngine(type: ASREngineType) {
    this.activeEngine?.dispose();
    this.engineType = type;
    if (type === "local") {
      this.activeEngine = new LocalASREngine(
        { localUrl: this.localUrl, selectedDeviceId: this.selectedDeviceId },
        this.wrapCallbacks("local"),
      );
    } else if (type === "browser") {
      this.activeEngine = this.browserEngine;
    } else {
      this.activeEngine = null;
    }
    logASR(`Selected engine: ${type}`);
    this.callbacks.onEngineChange?.(type, this.getEngineLabel());
  }

  private setState(state: ASRState) {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }
}
