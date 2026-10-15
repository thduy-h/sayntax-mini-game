const STORAGE_PREFIX = "scc_demo_progress:";

export interface DemoProgressState {
  completedStepIds: string[];
  currentStepIndex: number;
  updatedAt: string;
}

export type LessonPersistenceMode = "authenticated" | "demo";

export function shouldUseServerPersistence(mode: LessonPersistenceMode) {
  return mode === "authenticated";
}

function storageKey(lessonSlug: string) {
  return `${STORAGE_PREFIX}${lessonSlug}`;
}

export function createEmptyDemoProgress(): DemoProgressState {
  return {
    completedStepIds: [],
    currentStepIndex: 0,
    updatedAt: new Date(0).toISOString(),
  };
}

export function readDemoProgressFromStorage(
  storage: Pick<Storage, "getItem">,
  lessonSlug: string,
): DemoProgressState {
  try {
    const raw = storage.getItem(storageKey(lessonSlug));
    if (!raw) return createEmptyDemoProgress();
    const parsed = JSON.parse(raw) as Partial<DemoProgressState>;
    return {
      completedStepIds: Array.isArray(parsed.completedStepIds)
        ? parsed.completedStepIds.filter((id): id is string => typeof id === "string")
        : [],
      currentStepIndex:
        typeof parsed.currentStepIndex === "number" && Number.isFinite(parsed.currentStepIndex)
          ? Math.max(0, Math.floor(parsed.currentStepIndex))
          : 0,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return createEmptyDemoProgress();
  }
}

export function writeDemoProgressToStorage(
  storage: Pick<Storage, "setItem">,
  lessonSlug: string,
  progress: DemoProgressState,
) {
  try {
    storage.setItem(storageKey(lessonSlug), JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function markDemoStepCompleted(
  current: DemoProgressState,
  stepId: string,
  currentStepIndex: number,
  now = new Date(),
): DemoProgressState {
  return {
    completedStepIds: Array.from(new Set([...current.completedStepIds, stepId])),
    currentStepIndex: Math.max(0, Math.floor(currentStepIndex)),
    updatedAt: now.toISOString(),
  };
}

export function resetDemoProgressInStorage(storage: Pick<Storage, "removeItem">, lessonSlug?: string) {
  try {
    if (lessonSlug) {
      storage.removeItem(storageKey(lessonSlug));
      return true;
    }
    const localStorageLike = storage as Storage;
    for (let index = localStorageLike.length - 1; index >= 0; index -= 1) {
      const key = localStorageLike.key(index);
      if (key?.startsWith(STORAGE_PREFIX)) localStorageLike.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}

export function demoProgressKeyForTest(lessonSlug: string) {
  return storageKey(lessonSlug);
}
