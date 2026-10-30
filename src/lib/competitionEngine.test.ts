import { describe, it, expect } from "vitest";
import { simulate } from "../features/competition/robotEngine";
import type { MapDefinition } from "../features/competition/types";
const map: MapDefinition = {
  id: "test",
  name: "Test",
  width: 6,
  height: 6,
  start: { x: 0, y: 0 },
  goal: { x: 2, y: 0 },
  walls: [],
  initialDirection: 1,
  maxCommands: 24,
};
describe("competition local simulator without solver metadata", () => {
  it("stops at goal rather than executing trailing commands", () => {
    const trace = simulate(map, ["forward", "forward", "left", "forward"]);
    expect(trace).toHaveLength(3);
    expect(trace[trace.length - 1]).toMatchObject({ x: 2, y: 0, goal: true });
  });
  it("turns on the spot and collides without entering a wall", () => {
    expect(simulate({ ...map, walls: ["1,0"] }, ["forward"])[1]).toMatchObject({
      x: 0,
      y: 0,
      blocked: true,
    });
    expect(simulate(map, ["right", "left", "left"])[3]).toMatchObject({
      x: 0,
      y: 0,
      direction: 0,
    });
  });
  it("respects boundaries and 24-command cap", () => {
    expect(simulate(map, ["left", "forward"])[2]?.blocked).toBe(true);
    expect(simulate(map, Array(25).fill("right"))).toHaveLength(25);
  });
  it("is deterministic and does not mutate canonical maps", () => {
    const original = JSON.stringify(map);
    expect(simulate(map, ["right", "forward"])).toEqual(
      simulate(map, ["right", "forward"]),
    );
    expect(JSON.stringify(map)).toBe(original);
  });
});
