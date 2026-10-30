import { describe, expect, it } from "vitest";
import type { ArenaState } from "../types";
import { roundResults } from "./roundResults";

const state = (game: "accessibility" | "robot", score: number): ArenaState => ({
  room: { id: "room", code: "ABC234", status: "locked", expires_at: "2099-01-01", version: 2 },
  round: { id: game, game, status: "completed", config: game === "accessibility" ? { scenarioIds: ["contrast", "keyboard", "captions", "language"] } : { levelIds: ["1", "2", "3"] }, content_version: "2026-10-29" },
  teams: [{ id: "a", name: "Đội A", created_at: "2026-10-30" }, { id: "b", name: "Đội B", created_at: "2026-10-30" }],
  scores: [{ team_id: "a", score, updated_at: "2026-10-30" }],
});

describe("separate workshop game summaries", () => {
  it("uses only the current round's authoritative score, without adding earlier games", () => {
    expect(roundResults(state("accessibility", 100))?.teams[0].score).toBe(100);
    expect(roundResults(state("robot", 320))?.teams[0].score).toBe(320);
    expect(roundResults(state("robot", 0))?.teams.every((team) => team.score === 0)).toBe(true);
  });
  it("labels each game and calculates its own score ceiling", () => {
    expect(roundResults(state("accessibility", 100))).toMatchObject({ title: "Accessibility Unlock", maximum: 400, completed: true });
    expect(roundResults(state("robot", 320))).toMatchObject({ title: "Robot Commands", maximum: 960, completed: true });
  });
  it("includes teams without a submission at zero and assigns equal ranks for ties", () => {
    const summary = roundResults(state("accessibility", 0))!;
    expect(summary.teams.map((team) => [team.id, team.score, team.rank])).toEqual([["a", 0, 1], ["b", 0, 1]]);
  });
  it("ignores score records for teams outside this room and never mutates input", () => {
    const input = state("robot", 320);
    input.scores.push({ team_id: "stranger", score: 999, updated_at: "2026-10-30" });
    input.teams.reverse();
    expect(roundResults(input)?.teams.map((team) => team.id)).toEqual(["a", "b"]);
    expect(input.teams[0].id).toBe("b");
  });
  it("distinguishes a running round and an interrupted round", () => {
    const input = state("robot", 320);
    input.round!.status = "running";
    expect(roundResults(input)).toMatchObject({ completed: false, interrupted: false });
    input.round!.status = "interrupted";
    expect(roundResults(input)).toMatchObject({ completed: false, interrupted: true });
  });
  it("has no game result before the MC starts a round", () => {
    const input = state("robot", 0); input.round = null;
    expect(roundResults(input)).toBeNull();
  });
});
