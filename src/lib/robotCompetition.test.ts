import { describe, expect, it } from "vitest";
import { isDefinitiveRobotRejection } from "../features/competition/contracts";
import { resolveStageChallenge } from "../features/competition/canonicalQuestions";
import type { Stage } from "../features/competition/types";

describe("official Robot prompt boundary", () => {
  const stage: Stage = { stageNo: 2, status: "active", roundId: "synthetic", startedAt: null, deadlineAt: null, activeIndex: 0, activeItemId: "1" };
  it("fails closed instead of substituting a public practice map", () => {
    expect(resolveStageChallenge(stage)).toBeNull();
    expect(resolveStageChallenge({ ...stage, config: { levelIds: ["1"] } })).toBeNull();
  });
  it("uses the exact released server map, including its obstacles", () => {
    const map = { id: "1", name: "Frozen synthetic", width: 6, height: 6, start: { x: 3, y: 4 }, goal: { x: 0, y: 2 }, walls: ["1,3"], initialDirection: 0, maxCommands: 24 };
    expect(resolveStageChallenge({ ...stage, challenge: map })).toBe(map);
    expect(resolveStageChallenge({ ...stage, config: { maps: [map] } })).toBe(map);
  });
});

it("retains ambiguous network retries but unlocks a definitively rejected run", () => {
  expect(isDefinitiveRobotRejection(new Error("network failed"))).toBe(false);
  expect(isDefinitiveRobotRejection({ code: "optimization_required" })).toBe(true);
  expect(isDefinitiveRobotRejection({ code: "rate_limited" })).toBe(false);
});
