import { BrowserSpeechRecognitionEngine } from "./browser-engine";
import { logASR } from "./config";
import { ServerASREngine } from "./local-engine";
import type { ASREngine, ASREngineCallbacks, ASREngineType, ASRError, ASRState } from "./types";

interface HybridASRManagerOptions {
  callbacks: ASREngineCallbacks;
  createBrowserEngine?: (callbacks: ASREngineCallbacks) => ASREngine;
  createServerEngine?: (callbacks: ASREngineCallbacks) => ASREngine;
  selectedDeviceId: () => string;
}

export function shouldFallbackToBrowser(error: ASRError) {
  return error.code === "upstream_unavailable";
}

export class HybridASRManager {
  private activeEngine: ASREngine | null = null;
  private browserEngine: ASREngine;
  private callbacks: ASREngineCallbacks;
  private engineType: ASREngineType = "unavailable";
  private serverEngine: ASREngine;
  private state: ASRState = "checking";
  private preferredEngine: "browser" | "server" = "browser";

  constructor(options: HybridASRManagerOptions) {
    this.callbacks = options.callbacks;
    const browserCallbacks = this.wrapCallbacks("browser");
    const serverCallbacks = this.wrapCallbacks("server");
    this.browserEngine = options.createBrowserEngine?.(browserCallbacks)
      ?? new BrowserSpeechRecognitionEngine(browserCallbacks);
    this.serverEngine = options.createServerEngine?.(serverCallbacks)
      ?? new ServerASREngine({ selectedDeviceId: options.selectedDeviceId }, serverCallbacks);
  }

  async initialize(preferredEngine = this.preferredEngine) {
    this.preferredEngine = preferredEngine;
    this.setState("checking");
    const engine = preferredEngine === "browser" ? this.browserEngine : this.serverEngine;
    if (engine.isSupported()) {
      this.setActiveEngine(preferredEngine);
      this.setState("stopped");
      return;
    }
    this.setActiveEngine("unavailable");
    this.callbacks.onError?.({
      code: "not_supported",
      message: "Trình duyệt chưa hỗ trợ nhận dạng giọng nói. Bạn có thể chọn Groq hoặc kéo thả khối.",
      recoverable: false,
    });
    this.setState("unavailable");
  }

  async selectEngine(engine: "browser" | "server") {
    await this.stop();
    await this.initialize(engine);
  }

  async retryPrimary() {
    if (["listening", "processing", "starting"].includes(this.state)) return;
    await this.initialize();
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
    this.browserEngine.dispose();
    this.serverEngine.dispose();
    this.activeEngine = null;
  }

  private wrapCallbacks(engine: "server" | "browser"): ASREngineCallbacks {
    return {
      onError: (error) => {
        if (this.activeEngine !== (engine === "server" ? this.serverEngine : this.browserEngine)) return;
        if (engine === "server" && shouldFallbackToBrowser(error)) {
          if (this.browserEngine.isSupported()) {
            this.setActiveEngine("browser");
            void this.browserEngine.start();
            return;
          } else {
            this.callbacks.onError?.(error);
            this.setActiveEngine("unavailable");
            this.setState("unavailable");
            return;
          }
        }
        this.callbacks.onError?.(error);
      },
      onFinalResult: (result) => {
        if (this.activeEngine !== (engine === "server" ? this.serverEngine : this.browserEngine)) return;
        if (result.engine === "cloud") this.publishEngine("cloud", "Groq · Whisper");
        if (result.engine === "local") this.publishEngine("local", "Nhận dạng giọng nói SAYNTAX");
        this.callbacks.onFinalResult?.(result);
      },
      onInterimResult: (text) => {
        if (this.activeEngine === (engine === "server" ? this.serverEngine : this.browserEngine)) this.callbacks.onInterimResult?.(text);
      },
      onStateChange: (state) => {
        if (this.activeEngine === (engine === "server" ? this.serverEngine : this.browserEngine)) this.setState(state);
      },
    };
  }

  private publishEngine(type: ASREngineType, label: string) {
    this.engineType = type;
    this.callbacks.onEngineChange?.(type, label);
  }

  private setActiveEngine(type: "server" | "browser" | "unavailable") {
    this.activeEngine = type === "server" ? this.serverEngine : type === "browser" ? this.browserEngine : null;
    const label = type === "server" ? "Groq · Whisper" : type === "browser" ? "Nhận dạng của trình duyệt" : "Không khả dụng";
    this.publishEngine(type, label);
    logASR(`Selected engine: ${type}`);
  }

  private setState(state: ASRState) {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }
}
