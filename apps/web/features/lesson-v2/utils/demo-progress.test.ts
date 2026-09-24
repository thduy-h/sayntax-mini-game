import assert from "node:assert/strict";

import {
  createEmptyDemoProgress,
  demoProgressKeyForTest,
  markDemoStepCompleted,
  readDemoProgressFromStorage,
  resetDemoProgressInStorage,
  shouldUseServerPersistence,
  writeDemoProgressToStorage,
} from "./demo-progress";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const storage = new MemoryStorage();
const empty = readDemoProgressFromStorage(storage, "start-and-sequence-v2");
assert.deepEqual(empty, createEmptyDemoProgress());

const completed = markDemoStepCompleted(empty, "step-1", 1, new Date("2026-01-01T00:00:00.000Z"));
writeDemoProgressToStorage(storage, "start-and-sequence-v2", completed);
assert.deepEqual(readDemoProgressFromStorage(storage, "start-and-sequence-v2"), completed);

storage.setItem(demoProgressKeyForTest("bad"), "{not json");
assert.deepEqual(readDemoProgressFromStorage(storage, "bad"), createEmptyDemoProgress());

resetDemoProgressInStorage(storage, "start-and-sequence-v2");
assert.equal(storage.getItem(demoProgressKeyForTest("start-and-sequence-v2")), null);

writeDemoProgressToStorage(storage, "a", markDemoStepCompleted(empty, "a1", 2));
writeDemoProgressToStorage(storage, "b", markDemoStepCompleted(empty, "b1", 3));
storage.setItem("other", "keep");
resetDemoProgressInStorage(storage);
assert.equal(storage.getItem(demoProgressKeyForTest("a")), null);
assert.equal(storage.getItem(demoProgressKeyForTest("b")), null);
assert.equal(storage.getItem("other"), "keep");
assert.equal(shouldUseServerPersistence("demo"), false);
assert.equal(shouldUseServerPersistence("authenticated"), true);

console.log("demo-progress tests passed");
