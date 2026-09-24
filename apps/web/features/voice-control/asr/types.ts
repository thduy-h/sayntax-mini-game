export type ASREngineType = "local" | "browser" | "unavailable";
export type ASRMode = "auto" | "local" | "browser";
export type ASRState = "idle" | "checking" | "starting" | "listening" | "processing" | "stopped" | "unavailable";

export interface ASRError {
  code:
    | "not_supported"
    | "permission_denied"
    | "microphone_missing"
    | "microphone_busy"
    | "network"
    | "no_speech"
    | "aborted"
    | "transcribe_failed"
    | "unknown";
  message: string;
  recoverable: boolean;
}

export interface ASRAlternative {
  confidence?: number;
  transcript: string;
}

export interface ASRFinalResult {
  alternatives: ASRAlternative[];
  engine: ASREngineType;
  text: string;
}

export interface ASREngineCallbacks {
  onEngineChange?: (engine: ASREngineType, label: string) => void;
  onError?: (error: ASRError) => void;
  onFinalResult?: (result: ASRFinalResult) => void;
  onInterimResult?: (text: string) => void;
  onStateChange?: (state: ASRState) => void;
}

export interface ASREngine {
  readonly type: ASREngineType;
  isSupported(): boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
  dispose(): void;
}

export interface LocalASRHealth {
  compute_type: string;
  device: string;
  model: string;
  status: "ok";
}
