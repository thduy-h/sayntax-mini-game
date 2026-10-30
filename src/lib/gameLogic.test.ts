import { describe, expect, it } from "vitest";
import {
  accessibilityScenarios,
  directionAngle,
  directionLabel,
  evaluateAccessibilityChoice,
  robotLevels,
  runRobot,
  scoreRobot,
  generateRobotLevel,
  turn,
} from "./gameLogic";

describe("robot engine", () => {
  it("reaches level one with the par sequence", () => {
    const result = runRobot(robotLevels[0], ["forward", "forward", "forward", "forward"]);
    expect(result.reachedGoal).toBe(true);
    expect(scoreRobot(robotLevels[0], ["forward", "forward", "forward", "forward"])).toBe(320);
    expect(result.steps).toHaveLength(4);
    expect(result.steps[0].command).toBe("forward");
    expect(result.steps[0].blocked).toBe(false);
  });

  it("stops at a wall and reports the command index", () => {
    const result = runRobot(robotLevels[1], ["forward", "forward", "forward"]);
    expect(result.reachedGoal).toBe(false);
    expect(result.blockedAt).toBe(1);
    expect(result.steps[1].blocked).toBe(true);
  });

  it("records rotation in step history when turning", () => {
    // East is direction 1. Turn left -> North (0). Turn right -> South (2).
    expect(turn(1, "left")).toBe(0);
    expect(turn(1, "right")).toBe(2);

    const result = runRobot(robotLevels[0], ["left", "right"]);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].direction).toBe(0); // North
    expect(result.steps[1].direction).toBe(1); // Back to East
  });

  it("calculates correct direction angle and labels", () => {
    expect(directionAngle(0)).toBe(0);
    expect(directionAngle(1)).toBe(90);
    expect(directionAngle(2)).toBe(180);
    expect(directionAngle(3)).toBe(270);

    expect(directionLabel(0)).toContain("Bắc");
    expect(directionLabel(1)).toContain("Đông");
  });

  it("solves every curated robot level within the command limit", async () => {
    const { solveRobot } = await import("./gameLogic");
    robotLevels.forEach((level) => {
      const solution = solveRobot(level);
      expect(solution).not.toBeNull();
      expect(solution!.length).toBeLessThanOrEqual(24);
      expect(runRobot(level, solution!).reachedGoal).toBe(true);
      expect(level.par).toBe(solution!.length);
    });
  });
});

describe("accessibility engine", () => {
  it("has one clear best practice per scenario", () => {
    expect(accessibilityScenarios).toHaveLength(12);
    accessibilityScenarios.forEach((scenario) => {
      expect(scenario.options.filter((option) => option.correct)).toHaveLength(1);
    });
  });

  it("selects a deterministic four-question round without duplicates", async () => {
    const { selectAccessibilityScenarios } = await import("./gameLogic");
    const a = selectAccessibilityScenarios({ seed: "workshop-2026", count: 4 });
    const b = selectAccessibilityScenarios({ seed: "workshop-2026", count: 4 });
    expect(a).toEqual(b);
    expect(new Set(a.scenarioIds).size).toBe(4);
  });

  it("generates a reproducible solvable map with bounded commands", () => {
    const config = { seed: "demo-42", width: 6, height: 6, difficulty: "intermediate" as const, obstacleDensity: 0.18, maxCommands: 24 };
    const a = generateRobotLevel(config);
    const b = generateRobotLevel(config);
    expect(a).toEqual(b);
    expect(a.optimalCommands).toBeDefined();
    expect(a.optimalCommands!.length).toBeLessThanOrEqual(24);
    expect(runRobot(a, a.optimalCommands!).reachedGoal).toBe(true);
  });

  it("awards the defined score and rejects unknown answers", () => {
    expect(evaluateAccessibilityChoice(accessibilityScenarios[0], "contrast")).toEqual({
      correct: true,
      points: 100,
    });
    expect(evaluateAccessibilityChoice(accessibilityScenarios[0], "missing")).toEqual({
      correct: false,
      points: 0,
    });
  });
});
