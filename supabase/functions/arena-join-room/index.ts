import {
  competitionJoin,
  resolveJoinCode,
} from "../_shared/competition-api.ts";
import { body, clientAddress, json, requireString } from "../_shared/http.ts";
import { admin, sha256 } from "../_shared/db.ts";
import { serve } from "../_shared/handler.ts";
import { rateLimit } from "../_shared/rate.ts";
function randomToken() {
  return (
    crypto.randomUUID().replaceAll("-", "") +
    crypto.randomUUID().replaceAll("-", "")
  );
}
serve(async (request) => {
  const input = await body(request);
  if (input.action === "resolve") return resolveJoinCode(request, input);
  if (input.mode === "competition") return competitionJoin(request, input);
  const code = requireString(input.code, "room_code", 6).toUpperCase();
  const name = requireString(input.name, "team_name", 40).trim();
  const db = admin();
  await rateLimit(db, `join:${clientAddress(request)}:${code}`, 30, 60);
  const { data: room } = await db
    .from("rooms")
    .select("id,status,expires_at,competition_id")
    .eq("code", code)
    .single();
  if (room?.competition_id) throw new Error("competition_identity_required");
  if (
    !room ||
    room.status !== "lobby" ||
    new Date(room.expires_at) <= new Date()
  )
    throw new Error("not_found");
  const { count } = await db
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id);
  if ((count ?? 0) >= 8) throw new Error("room_team_limit_reached");
  const token = randomToken();
  const { data: team, error } = await db
    .from("teams")
    .insert({
      room_id: room.id,
      name,
      join_token_hash: await sha256(token),
      token_expires_at: room.expires_at,
    })
    .select("id,name")
    .single();
  if (error || !team) {
    if (error?.message.includes("room_team_limit_reached"))
      throw new Error("room_team_limit_reached");
    throw new Error(
      error?.code === "23505" ? "team_name_taken" : "team_join_failed",
    );
  }
  return json({ roomId: room.id, team, teamToken: token });
});
