export const FIRST_TIME_GUIDANCE_VERSION = 1;
export const FIRST_TIME_GUIDANCE_STORAGE_KEY = "sayntax:first-time-guidance";

export type GuidanceStage = 1 | 2 | 3;
export type GuidanceStatus = "active" | "skipped" | "completed";

export interface GuidanceProgress {
  version: number;
  status: GuidanceStatus;
  stage: GuidanceStage;
}

export type GuidanceSuccess = "help" | "scroll" | "demo";
export interface GuidanceCommandResult {
  command: string;
  handled: boolean;
  target: string;
}

export const INITIAL_GUIDANCE_PROGRESS: GuidanceProgress = {
  version: FIRST_TIME_GUIDANCE_VERSION,
  status: "active",
  stage: 1,
};

function isStage(value: unknown): value is GuidanceStage {
  return value === 1 || value === 2 || value === 3;
}

function isStatus(value: unknown): value is GuidanceStatus {
  return value === "active" || value === "skipped" || value === "completed";
}

export function readGuidanceProgress(storage: Pick<Storage, "getItem"> | null | undefined): GuidanceProgress {
  if (!storage) return INITIAL_GUIDANCE_PROGRESS;
  try {
    const raw = storage.getItem(FIRST_TIME_GUIDANCE_STORAGE_KEY);
    if (!raw) return INITIAL_GUIDANCE_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<GuidanceProgress>;
    if (parsed.version !== FIRST_TIME_GUIDANCE_VERSION || !isStatus(parsed.status) || !isStage(parsed.stage)) {
      return INITIAL_GUIDANCE_PROGRESS;
    }
    return { version: FIRST_TIME_GUIDANCE_VERSION, status: parsed.status, stage: parsed.stage };
  } catch {
    return INITIAL_GUIDANCE_PROGRESS;
  }
}

export function writeGuidanceProgress(storage: Pick<Storage, "setItem"> | null | undefined, progress: GuidanceProgress) {
  if (!storage) return;
  try {
    storage.setItem(FIRST_TIME_GUIDANCE_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Browser storage is optional; guidance remains usable for this session.
  }
}

export function progressAfterSuccess(progress: GuidanceProgress, success: GuidanceSuccess): GuidanceProgress {
  if (progress.status !== "active") return progress;
  if (progress.stage === 1 && success === "help") {
    return { ...progress, stage: 2 };
  }
  if (progress.stage === 2 && success === "scroll") {
    return { ...progress, stage: 3, status: "active" };
  }
  if (progress.stage === 3 && success === "demo") {
    return { ...progress, stage: 3, status: "completed" };
  }
  return progress;
}

export function completeGuidance(progress: GuidanceProgress): GuidanceProgress {
  return { ...progress, status: "completed", stage: 3 };
}

export function guidanceSuccessForResult(progress: GuidanceProgress, result: GuidanceCommandResult, parse: (command: string) => { kind: string; direction?: string }) {
  if (progress.status !== "active" || result.target !== "website" || !result.handled) return null;
  const command = parse(result.command);
  if (progress.stage === 1 && command.kind === "help") return "help" as const;
  if (progress.stage === 2 && command.kind === "scroll" && command.direction === "down") return "scroll" as const;
  if (progress.stage === 3 && command.kind === "demo") return "demo" as const;
  return null;
}

export function reopenGuidance(progress: GuidanceProgress): GuidanceProgress {
  return { ...progress, status: "active", stage: 1 };
}

export function skipGuidance(progress: GuidanceProgress): GuidanceProgress {
  return { ...progress, status: "skipped" };
}
