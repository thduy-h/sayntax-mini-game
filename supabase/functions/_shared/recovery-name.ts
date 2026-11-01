// Name lookup identifies an existing competition team, not an authentication grant.
// Only an MC-approved recovery request can activate the new credential.
export type RecoveryTeam = { id: string; name: string };

const normalized = (value: string) =>
  value.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("vi");

export function findRecoveryTeamId(teams: RecoveryTeam[], candidate: string): string {
  const name = candidate.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (name.length < 2 || name.length > 40) throw new Error("invalid_team_name");
  const matches = teams.filter((team) => normalized(team.name) === normalized(name));
  if (matches.length === 0) throw new Error("team_not_found");
  if (matches.length === 1) return matches[0].id;
  // Distinct registered names may differ only by capitalization or whitespace.
  // Match the exact spelling if possible; otherwise refuse to recover the wrong team.
  const exact = matches.filter(
    (team) => team.name.normalize("NFC").trim().replace(/\s+/gu, " ") === name,
  );
  if (exact.length === 1) return exact[0].id;
  throw new Error("ambiguous_team_name");
}
