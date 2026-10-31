import { submitTie, verifyCompetitionSubmission } from "./competition-api.ts";
import { body, json, requireString } from "./http.ts";
import { admin, sha256, token } from "./db.ts";
import { rateLimit } from "./rate.ts";
import { verifySubmission } from "./submission.ts";

export async function submit(request: Request, game: "accessibility" | "robot") {
  const input = await body(request);
  if(game==="accessibility" && input.action==="submit_tiebreak")return submitTie(request,input);
  const roundId = requireString(input.roundId, "round_id");
  const teamId = requireString(input.teamId, "team_id");
  const itemId = requireString(input.itemId, "item_id", 40);
  const key = requireString(input.idempotencyKey, "idempotency_key", 200);
  const hash = await sha256(token(request, "x-team-token"));
  const db = admin();
  await rateLimit(db, `submit:${hash}`, 120, 60);
  // Early checks avoid exposing round content/computing scores for unrelated teams.
  // These reads grant no write authority: the RPC repeats all checks under locks.
  const { data: team } = await db.from("teams").select("room_id,join_token_hash").eq("id", teamId).single();
  if (!team || team.join_token_hash !== hash) throw new Error("forbidden");
  const { data: round } = await db.from("rounds").select("room_id,game,config,content_version").eq("id", roundId).single();
  if (!round || round.room_id !== team.room_id || round.game !== game) throw new Error("round_not_running");
  const verified = ["competition-v2-1","competition-v5-1"].includes(round.content_version) ? verifyCompetitionSubmission(game,input,round) : verifySubmission(game, input, round);
  const { data: result, error } = await db.rpc("process_submission", {
    p_round_id: roundId, p_team_id: teamId, p_token_hash: hash, p_game: game,
    p_item_id: itemId, p_idempotency_key: key, p_payload: verified.payload,
    p_successful: verified.successful, p_score: verified.score,
    p_content_version: round.content_version, p_config: round.config,
  });
  if (error || !result) {
    const safe = ["forbidden", "round_not_running", "round_content_mismatch", "item_not_in_round", "invalid_idempotency_reuse", "invalid_verified_submission","stage_closed","inactive_challenge","optimization_required","optimization_limit","already_optimal","invalid_optimization"];
    throw new Error(safe.find((code) => error?.message?.includes(code)) ?? "submission_failed");
  }
  return json(result, result.verified || result.accepted ? 200 : 422);
}
