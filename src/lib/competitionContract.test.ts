import { describe, expect, it } from "vitest";
import {
  isCompetitionId,
  parseCreatedCompetition,
} from "../features/competition/contracts";
const id = "90000000-0000-0000-0000-000000000001",
  token = "synthetic-mc-token-for-tests";
describe("Competition creation API compatibility", () => {
  it("accepts V2 creation with a competition UUID and MC credential", () => {
    expect(
      parseCreatedCompetition({
        competitionId: id,
        mcToken: token,
        stage1Code: "ABC234",
      }),
    ).toEqual({ competitionId: id, mcToken: token });
  });
  it("rejects a successful legacy room response instead of navigating to undefined", () => {
    expect(
      parseCreatedCompetition({ room: { id, code: "ABC234" }, mcToken: token }),
    ).toBeNull();
  });
  it("rejects malformed or absent IDs even when a credential is returned", () => {
    for (const competitionId of [
      undefined,
      null,
      "",
      "undefined",
      "null",
      "ABC234",
      {},
      id + "/extra",
    ]) {
      expect(
        parseCreatedCompetition({ competitionId, mcToken: token }),
      ).toBeNull();
      expect(isCompetitionId(competitionId)).toBe(false);
    }
  });
  it("rejects missing or unusable MC credentials", () => {
    for (const mcToken of [
      null,
      undefined,
      "",
      12,
      "short",
      " ".repeat(32),
      "a".repeat(201),
    ])
      expect(
        parseCreatedCompetition({ competitionId: id, mcToken }),
      ).toBeNull();
  });
  it("rejects non-object responses", () => {
    for (const value of [undefined, null, [], "ok", 42])
      expect(parseCreatedCompetition(value)).toBeNull();
  });
});
