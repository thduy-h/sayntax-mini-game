import assert from "node:assert/strict";
import {
  FIRST_TIME_GUIDANCE_STORAGE_KEY,
  INITIAL_GUIDANCE_PROGRESS,
  completeGuidance,
  guidanceSuccessForResult,
  progressAfterSuccess,
  readGuidanceProgress,
  reopenGuidance,
  skipGuidance,
  writeGuidanceProgress,
} from "./guidance-progress";

assert.deepEqual(progressAfterSuccess(INITIAL_GUIDANCE_PROGRESS, "help"), {
  version: 1,
  status: "active",
  stage: 2,
});
assert.deepEqual(progressAfterSuccess(INITIAL_GUIDANCE_PROGRESS, "scroll"), INITIAL_GUIDANCE_PROGRESS);
assert.deepEqual(progressAfterSuccess({ version: 1, status: "active", stage: 2 }, "help"), {
  version: 1,
  status: "active",
  stage: 2,
});
assert.deepEqual(progressAfterSuccess({ version: 1, status: "active", stage: 2 }, "scroll"), {
  version: 1,
  status: "active",
  stage: 3,
});
assert.deepEqual(progressAfterSuccess({ version: 1, status: "active", stage: 3 }, "demo"), {
  version: 1,
  status: "completed",
  stage: 3,
});
assert.deepEqual(completeGuidance({ version: 1, status: "active", stage: 3 }), {
  version: 1,
  status: "completed",
  stage: 3,
});
const parse = (command: string) => command === "Trợ giúp"
  ? { kind: "help" }
  : command === "Cuộn xuống"
    ? { kind: "scroll", direction: "down" }
    : command === "Học thử"
      ? { kind: "demo" }
      : { kind: "unknown" };
assert.equal(guidanceSuccessForResult(INITIAL_GUIDANCE_PROGRESS, { command: "Trợ giúp", handled: true, target: "website" }, parse), "help");
assert.equal(guidanceSuccessForResult(INITIAL_GUIDANCE_PROGRESS, { command: "Trợ giúp", handled: false, target: "website" }, parse), null);
assert.equal(guidanceSuccessForResult(INITIAL_GUIDANCE_PROGRESS, { command: "Cuộn xuống", handled: true, target: "website" }, parse), null);
assert.equal(guidanceSuccessForResult({ version: 1, status: "active", stage: 2 }, { command: "Cuộn xuống", handled: true, target: "website" }, parse), "scroll");
assert.equal(guidanceSuccessForResult({ version: 1, status: "active", stage: 2 }, { command: "Trợ giúp", handled: true, target: "workspace" }, parse), null);
assert.equal(guidanceSuccessForResult({ version: 1, status: "active", stage: 3 }, { command: "Học thử", handled: true, target: "website" }, parse), "demo");

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
};
writeGuidanceProgress(storage, { version: 1, status: "skipped", stage: 1 });
assert.equal(values.has(FIRST_TIME_GUIDANCE_STORAGE_KEY), true);
assert.deepEqual(readGuidanceProgress(storage), { version: 1, status: "skipped", stage: 1 });
assert.deepEqual(readGuidanceProgress({ getItem: () => JSON.stringify({ version: 99, status: "completed", stage: 3 }) }), INITIAL_GUIDANCE_PROGRESS);
assert.deepEqual(readGuidanceProgress({ getItem: () => JSON.stringify({ version: 1, status: "active", stage: 3 }) }), { version: 1, status: "active", stage: 3 });
assert.deepEqual(readGuidanceProgress({ getItem: () => JSON.stringify({ version: 1, status: "completed", stage: 3 }) }), { version: 1, status: "completed", stage: 3 });
assert.deepEqual(reopenGuidance({ version: 1, status: "skipped", stage: 1 }), { version: 1, status: "active", stage: 1 });
assert.deepEqual(reopenGuidance({ version: 1, status: "completed", stage: 3 }), { version: 1, status: "active", stage: 1 });
assert.deepEqual(reopenGuidance({ version: 1, status: "skipped", stage: 2 }), { version: 1, status: "active", stage: 1 });
assert.deepEqual(skipGuidance({ version: 1, status: "active", stage: 2 }), { version: 1, status: "skipped", stage: 2 });

const completed = completeGuidance(progressAfterSuccess(progressAfterSuccess(INITIAL_GUIDANCE_PROGRESS, "help"), "scroll"));
writeGuidanceProgress(storage, completed);
assert.deepEqual(readGuidanceProgress(storage), { version: 1, status: "completed", stage: 3 });
assert.equal(guidanceSuccessForResult(completed, { command: "Trợ giúp", handled: true, target: "website" }, parse), null);
assert.equal(guidanceSuccessForResult(skipGuidance(INITIAL_GUIDANCE_PROGRESS), { command: "Trợ giúp", handled: true, target: "website" }, parse), null);
assert.equal(guidanceSuccessForResult(INITIAL_GUIDANCE_PROGRESS, { command: "Trợ giúp", handled: true, target: "website" }, () => ({ kind: "click" })), null);
assert.deepEqual(Object.keys(JSON.parse(values.get(FIRST_TIME_GUIDANCE_STORAGE_KEY)!)).sort(), ["stage", "status", "version"]);

console.log("guidance-progress tests passed");
