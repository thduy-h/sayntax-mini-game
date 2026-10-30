import { admin, sha256, token } from "./db.ts";
import { clientAddress, json, requireString } from "./http.ts";
import { rateLimit } from "./rate.ts";
import {
  competitionConfig,
  COMPETITION_VERSION,
  competitionAnswer,
  competitionRobotScore,
  questionReview,
  shortestCommands,
  tieAnswer,
  tieQuestion,
} from "./competition-content.ts";
import { ROBOT_LEVELS } from "./canonical.ts";

export const randomCapability = () =>
  crypto.randomUUID().replaceAll("-", "") +
  crypto.randomUUID().replaceAll("-", "");
const safeErrors = [
  "forbidden",
  "not_found",
  "room_team_limit_reached",
  "stage_locked",
  "stage_closed",
  "configuration_frozen",
  "invalid_transition",
  "no_teams",
  "tie_unresolved",
  "tie_answers_pending",
  "competition_finalized",
  "invalid_recovery_request",
  "invalid_challenge",
  "rate_limited",
  "invalid_answer",
  "invalid_idempotency_reuse",
  "round_not_running",
  "item_not_in_round",
  "inactive_challenge",
  "teams_pending",
  "challenges_pending",
  "mc_progression_required",
];
async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await admin().rpc(name, args);
  if (error)
    throw new Error(
      safeErrors.find((code) => error.message.includes(code)) ??
        (error.code === "23505" ? "team_name_taken" : "competition_failed"),
    );
  return data;
}
function id(input: Record<string, unknown>) {
  return requireString(input.competitionId, "competition_id", 36);
}
function stage(input: Record<string, unknown>) {
  const value = Number(input.stage);
  if (value !== 1 && value !== 2) throw new Error("invalid_stage");
  return value;
}
export async function createCompetition(
  request: Request,
  input: Record<string, unknown>,
) {
  const db = admin();
  await rateLimit(db, `competition-create:${clientAddress(request)}`, 5, 600);
  const mcToken = randomCapability();
  const code = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return [...crypto.getRandomValues(new Uint8Array(6))]
      .map((b) => alphabet[b % alphabet.length])
      .join("");
  };
  const result = await rpc("create_competition", {
    p_name: requireString(
      input.name ?? "SAYNTAX Workshop 2026",
      "competition_name",
      100,
    ),
    p_hash: await sha256(mcToken),
    p_code1: code(),
    p_code2: code(),
    p_config1: competitionConfig(1, input.config1),
    p_config2: competitionConfig(2, input.config2),
  });
  return json({ ...result, mcToken });
}
export async function resolveJoinCode(
  request: Request,
  input: Record<string, unknown>,
) {
  const code = requireString(input.code, "room_code", 6).toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code)) throw new Error("invalid_room_code");
  const db = admin();
  await rateLimit(db, `resolve:${clientAddress(request)}:${code}`, 60, 60);
  const { data: room, error } = await db
    .from("rooms")
    .select("competition_id,expires_at")
    .eq("code", code)
    .single();
  if (error && error.code !== "PGRST116") throw new Error("competition_failed");
  if (!room || Date.parse(room.expires_at) <= Date.now())
    throw new Error("not_found");
  return json(
    room.competition_id
      ? { mode: "competition", competitionId: room.competition_id }
      : { mode: "workshop" },
  );
}

export async function competitionJoin(
  request: Request,
  input: Record<string, unknown>,
) {
  const db = admin();
  const code = requireString(input.code, "room_code", 6).toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code)) throw new Error("invalid_room_code");
  await rateLimit(
    db,
    `competition-join:${clientAddress(request)}:${code}`,
    30,
    60,
  );
  const { data: room } = await db
    .from("rooms")
    .select("id,competition_id,expires_at")
    .eq("code", code)
    .single();
  if (!room?.competition_id || Date.parse(room.expires_at) <= Date.now())
    throw new Error("not_found");
  if (input.action === "inspect") {
    const { data: c } = await db
      .from("competitions")
      .select("id,name,status")
      .eq("id", room.competition_id)
      .single();
    const { data: s } = await db
      .from("competition_stages")
      .select("stage_no,status")
      .eq("competition_id", room.competition_id)
      .eq(
        "stage_no",
        [
          "STAGE_1_FINALIZED",
          "STAGE_2_ACTIVE",
          "STAGE_2_FINALIZED",
          "FINALIZED",
        ].includes(c?.status ?? "")
          ? 2
          : 1,
      )
      .single();
    return json({
      competitionId: c?.id,
      name: c?.name,
      status: c?.status,
      stage: s?.stage_no,
    });
  }
  if (input.action === "request_recovery") {
    await rateLimit(db, `recovery:${clientAddress(request)}`, 6, 600);
    const credential = requireString(
      input.recoveryCredential,
      "recovery_credential",
      128,
    );
    if (credential.length < 32) throw new Error("invalid_credential");
    const requestId = await rpc("request_competition_recovery", {
      p_id: room.competition_id,
      p_team: requireString(input.competitionTeamId, "competition_team_id", 36),
      p_hash: await sha256(credential),
    });
    return json({ requestId });
  }
  const credential = requireString(
    input.recoveryCredential,
    "recovery_credential",
    128,
  );
  if (credential.length < 32) throw new Error("invalid_credential");
  const teamToken = randomCapability();
  const name = typeof input.name === "string" ? input.name.trim() : null;
  if (input.register !== true && name) throw new Error("invalid_recovery_flow");
  // Missing credential must never silently create a new team during restoration.
  if (input.register !== true) {
    const { data: existing } = await db
      .from("competition_teams")
      .select("id")
      .eq("competition_id", room.competition_id)
      .eq("recovery_hash", await sha256(credential))
      .is("recovery_revoked_at", null)
      .single();
    if (!existing) throw new Error("forbidden");
  }
  const result = await rpc("join_competition", {
    p_code: code,
    p_name: input.register === true ? name : null,
    p_recovery_hash: await sha256(credential),
    p_team_hash: await sha256(teamToken),
  });
  return json({ ...result, mode: "competition", teamToken });
}
export async function competitionControl(
  request: Request,
  input: Record<string, unknown>,
  start = false,
) {
  const hash = await sha256(token(request, "x-mc-token"));
  await rateLimit(admin(), `competition-manage:${hash}`, 90, 60);
  const action = start
    ? "start_stage"
    : requireString(input.action, "action", 40);
  const presentationToken =
    action === "presentation_rotate" ? randomCapability() : null;
  const stageNo = [
    "start_stage",
    "finalize_stage",
    "configure",
    "challenge",
    "show_demo",
    "advance_challenge",
    "close_challenge",
  ].includes(action)
    ? stage(input)
    : null;
  const result = await rpc("competition_control", {
    p_id: id(input),
    p_hash: hash,
    p_action: action,
    p_stage: stageNo,
    p_config:
      action === "configure" ? competitionConfig(stageNo!, input.config) : null,
    p_index: ["challenge", "advance_challenge", "close_challenge"].includes(
      action,
    )
      ? Number(input.index)
      : null,
    p_request:
      action === "approve_recovery"
        ? requireString(input.requestId, "request_id", 36)
        : null,
    p_presentation_hash: presentationToken
      ? await sha256(presentationToken)
      : null,
  });
  return json({
    ...result,
    ...(presentationToken ? { presentationToken } : {}),
  });
}
export async function competitionState(
  request: Request,
  input: Record<string, unknown>,
) {
  let role: string, hash: string;
  if (typeof input.presentationToken === "string") {
    role = "presentation";
    hash = await sha256(
      requireString(input.presentationToken, "presentation_token", 128),
    );
  } else if (request.headers.has("x-mc-token")) {
    role = "mc";
    hash = await sha256(token(request, "x-mc-token"));
  } else {
    role = "team";
    hash = await sha256(token(request, "x-team-token"));
  }
  // Spectator capability is intentionally shared. Budget nine screens on a
  // shared workshop NAT; ordinary MC/team credentials keep separate budgets.
  if (role === "presentation") {
    await rateLimit(
      admin(),
      `competition-presentation:${hash}:${clientAddress(request)}`,
      300,
      60,
    );
  }
  await rateLimit(
    admin(),
    `competition-state:${hash}`,
    role === "presentation" ? 600 : 60,
    60,
  );
  const state = await rpc("competition_state", {
    p_id: id(input),
    p_role: role,
    p_hash: hash,
    p_team: role === "team" ? requireString(input.teamId, "team_id", 36) : null,
  });
  // Post-stage review only. Spectators never receive answer/scoring/solver fields.
  if (role !== "presentation")
    for (const s of state.stages)
      if (s.status === "finalized") {
        s.review =
          s.stageNo === 1
            ? s.config.scenarioIds.map(questionReview)
            : s.config.levelIds.map((levelId: string) => ({
                itemId: levelId,
                optimalCommands: shortestCommands(ROBOT_LEVELS[levelId]),
              }));
      }
  if (state.tie?.active) state.tie.challenge = tieQuestion(state.tie.attempt);
  return json(state);
}
export function verifyCompetitionSubmission(
  game: "accessibility" | "robot",
  input: Record<string, unknown>,
  round: { content_version: string; config: Record<string, unknown> },
) {
  if (round.content_version !== COMPETITION_VERSION)
    throw new Error("round_content_mismatch");
  const item = requireString(input.itemId, "item_id", 40);
  const ids =
    game === "accessibility" ? round.config.scenarioIds : round.config.levelIds;
  if (!Array.isArray(ids) || !ids.includes(item))
    throw new Error("item_not_in_round");
  if (game === "accessibility") {
    const answerId = requireString(input.answerId, "answer_id", 40);
    return {
      successful: true,
      score: competitionAnswer(item, answerId),
      payload: { answerId },
    };
  }
  const r = competitionRobotScore(item, input.commands);
  return {
    successful: r.successful,
    score: r.score,
    payload: { commands: input.commands },
  };
}
export async function submitTie(
  request: Request,
  input: Record<string, unknown>,
) {
  const hash = await sha256(token(request, "x-team-token"));
  await rateLimit(admin(), `tie-submit:${hash}`, 30, 60);
  const attempt = Number(input.attempt);
  const answer = requireString(input.answerId, "answer_id", 40);
  const result = await rpc("submit_competition_tie", {
    p_id: id(input),
    p_team: requireString(input.teamId, "team_id", 36),
    p_hash: hash,
    p_answer: answer,
    p_score: tieAnswer(attempt, answer),
    p_attempt: attempt,
  });
  return json(result);
}
