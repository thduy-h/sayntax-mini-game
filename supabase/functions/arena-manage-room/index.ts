import { competitionControl } from "../_shared/competition-api.ts";
import { body, json, requireString } from "../_shared/http.ts";
import { admin, sha256, token } from "../_shared/db.ts";
import { serve } from "../_shared/handler.ts";
import { tokenIsValid } from "../_shared/authorization.ts";
import { rateLimit } from "../_shared/rate.ts";
serve(async (request) => {
  const input = await body(request); if(input.competitionId)return competitionControl(request,input); const code = requireString(input.code, "room_code", 6).toUpperCase(); const mcToken = token(request, "x-mc-token"); const db = admin(); const tokenHash = await sha256(mcToken); await rateLimit(db, `manage:${tokenHash}`, 60, 60);
  const { data: room } = await db.from("rooms").select("id,mc_token_hash,mc_token_expires_at,mc_token_revoked_at,status,expires_at,version").eq("code", code).single();
  if (!room || new Date(room.expires_at) <= new Date()) throw new Error("not_found");
  if (!tokenIsValid({ hash: room.mc_token_hash, expiresAt: room.mc_token_expires_at, revokedAt: room.mc_token_revoked_at }, tokenHash)) throw new Error("forbidden");
  const action = requireString(input.action, "action", 30); if (!["lock", "reopen", "end_round", "revoke_team", "end"].includes(action)) throw new Error("invalid_action");
  const teamId = action === "revoke_team" ? requireString(input.teamId, "team_id") : null;
  const { data: status, error } = await db.rpc("apply_room_action", { p_room_id: room.id, p_action: action, p_team_id: teamId, p_mc_token_hash: tokenHash });
  if (error || !status) { const message = error?.message ?? "room_action_failed"; if (message.includes("invalid_room_transition")) throw new Error("invalid_room_transition"); if (message.includes("team_not_found")) throw new Error("not_found"); throw new Error("room_action_failed"); }
  return json({ ok: true, status });
});
