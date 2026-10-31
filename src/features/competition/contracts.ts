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

// These errors are returned before an attempt can commit. Transport failures remain ambiguous.
export function isDefinitiveRobotRejection(error: unknown): boolean {
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  return typeof code === "string" && ["forbidden", "round_not_running", "round_content_mismatch", "item_not_in_round", "invalid_idempotency_reuse", "invalid_verified_submission", "stage_closed", "inactive_challenge", "optimization_required", "optimization_limit", "invalid_optimization", "invalid_commands"].includes(code);
}
