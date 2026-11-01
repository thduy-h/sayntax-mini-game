import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { findRecoveryTeamId } from "./recovery-name.ts";

Deno.test("recovery by existing name works with Vietnamese capitalization and extra spacing", () => {
  const teams = [{ id: "team-1", name: "Đội Tiên Phong" }, { id: "team-2", name: "Đội Robot" }];
  assertEquals(findRecoveryTeamId(teams, "  đội   TIÊN PHONG  "), "team-1");
  assertEquals(findRecoveryTeamId(teams, "Đội Robot"), "team-2");
});

Deno.test("unknown/invalid team names cannot create identities", () => {
  const teams = [{ id: "team-1", name: "Đội Alpha" }];
  assertThrows(() => findRecoveryTeamId(teams, "Đội Beta"), Error, "team_not_found");
  assertThrows(() => findRecoveryTeamId(teams, " "), Error, "invalid_team_name");
});

Deno.test("ambiguous names are rejected unless exactly disambiguated", () => {
  const teams = [{ id: "team-1", name: "Team A" }, { id: "team-2", name: "team a" }];
  assertThrows(() => findRecoveryTeamId(teams, "TEAM A"), Error, "ambiguous_team_name");
  assertEquals(findRecoveryTeamId(teams, "Team A"), "team-1");
  assertEquals(findRecoveryTeamId(teams, "team a"), "team-2");
});
