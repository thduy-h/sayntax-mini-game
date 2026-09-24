import type { ASRMode } from "./types";

const DEFAULT_LOCAL_ASR_URL = "http://127.0.0.1:8000";
const DEFAULT_HEALTH_TIMEOUT_MS = 1200;

function readMode(value: string | undefined): ASRMode {
  return value === "local" || value === "browser" || value === "auto" ? value : "auto";
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getASRConfig() {
  return {
    healthTimeoutMs: readPositiveInteger(process.env.NEXT_PUBLIC_ASR_HEALTH_TIMEOUT_MS, DEFAULT_HEALTH_TIMEOUT_MS),
    localUrl: process.env.NEXT_PUBLIC_LOCAL_ASR_URL || DEFAULT_LOCAL_ASR_URL,
    mode: readMode(process.env.NEXT_PUBLIC_ASR_MODE),
  };
}

export function logASR(message: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.info(`[ASR] ${message}`);
}
