// Validate the deployed API contract before storing credentials or navigating.
export function isCompetitionId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
export type CreatedCompetition = { competitionId: string; mcToken: string };
export function parseCreatedCompetition(
  value: unknown,
): CreatedCompetition | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  if (
    !isCompetitionId(result.competitionId) ||
    typeof result.mcToken !== "string" ||
    result.mcToken.length < 16 ||
    result.mcToken.length > 200 ||
    /\s/.test(result.mcToken)
  )
    return null;
  return { competitionId: result.competitionId, mcToken: result.mcToken };
}
