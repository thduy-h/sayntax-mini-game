import { describe, expect, it } from "vitest";
import {
  DEMO_MAP,
  DEMO_QUESTION,
  DEMO_SOLUTION,
} from "../features/competition/Demo";
import { simulate } from "../features/competition/robotEngine";

describe("dedicated unscored demos", () => {
  it("uses independent IDs, three choices and no competition score metadata", () => {
    expect(DEMO_QUESTION.id).toBe("demo-contrast-button");
    expect(DEMO_QUESTION.options).toHaveLength(3);
    expect(JSON.stringify(DEMO_QUESTION)).not.toMatch(
      /score|xp|roundId|competitionId/,
    );
    expect(DEMO_MAP.id).toBe("demo-robot-corner");
  });
  it("five-command robot tutorial reaches the goal and a collision fails", () => {
    const result = simulate(DEMO_MAP, DEMO_SOLUTION);
    expect(result.slice(-1)[0]?.goal).toBe(true);
    expect(result).toHaveLength(6);
    expect(simulate(DEMO_MAP, ["forward", "forward"]).slice(-1)[0]?.blocked).toBe(
      true,
    );
  });
  it("independently enumerates shorter demo programs, finding none that succeeds", () => {
    let programs: Array<Array<"forward" | "left" | "right">> = [[]];
    for (let n = 0; n < 5; n++) {
      expect(programs.some((p) => simulate(DEMO_MAP, p).slice(-1)[0]?.goal)).toBe(
        false,
      );
      programs = programs.flatMap((p) =>
        (["forward", "left", "right"] as const).map((c) => [...p, c]),
      );
    }
  });
});
