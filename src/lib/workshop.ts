import { createClient, type FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";
import type { ArenaState, GameId, RobotCommand, Team, WorkshopIdentity } from "../types";

export const supabase: SupabaseClient | null = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  : null;
export const standaloneMode = !supabase;
export const ARENA_POLL_INTERVAL_MS = 5000;
const IDENTITY_KEY = "sayntax-arena-identity-v1";
const colors = ["#ff765d", "#8b7bff", "#35c59b", "#f3b63e", "#4ea6ff", "#ec4899", "#8b5cf6", "#14b8a6"];

export class ArenaApiError extends Error {
  constructor(public code: string, public retryAfterSeconds?: number) { super(code); }
}

export async function invokeArena<T>(functionName: string, body: Record<string, unknown>, headers: Record<string, string> = {}): Promise<T> {
  if (!supabase) throw new ArenaApiError("arena_standalone_mode");
  const { data, error } = await supabase.functions.invoke(functionName, { body, headers });
  if (error) {
    let code = error.message;
    let retryAfterSeconds: number | undefined;
    const context = (error as FunctionsHttpError).context;
    if (context instanceof Response) {
      const payload = await context.clone().json().catch(() => null) as {
        error?: string; retryAfterSeconds?: number;
      } | null;
      code = payload?.error ?? code;
      const wait = Number(payload?.retryAfterSeconds ?? context.headers.get("retry-after"));
      if (Number.isFinite(wait) && wait > 0) retryAfterSeconds = Math.ceil(wait);
    }
    throw new ArenaApiError(code, retryAfterSeconds);
  }
  return data as T;
}

export function saveIdentity(identity: WorkshopIdentity | null) {
  if (identity) sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  else sessionStorage.removeItem(IDENTITY_KEY);
}
export function loadIdentity(): WorkshopIdentity | null {
  try { const value = sessionStorage.getItem(IDENTITY_KEY); return value ? JSON.parse(value) as WorkshopIdentity : null; } catch { return null; }
}
export function authHeaders(identity: WorkshopIdentity): Record<string, string> { return identity.role === "mc" ? { "x-mc-token": identity.token } : { "x-team-token": identity.token }; }

export async function createRoom() {
  const result = await invokeArena<{ room: ArenaState["room"]; mcToken: string }>("arena-create-room", {});
  const identity: WorkshopIdentity = { role: "mc", roomCode: result.room.code, token: result.mcToken };
  saveIdentity(identity); return { ...result, identity };
}
export async function joinRoom(code: string, name: string) {
  const result = await invokeArena<{ roomId: string; team: { id: string; name: string }; teamToken: string }>("arena-join-room", { code, name });
  const identity: WorkshopIdentity = { role: "team", roomCode: code.toUpperCase(), token: result.teamToken, teamId: result.team.id, teamName: result.team.name };
  saveIdentity(identity); return { ...result, identity };
}
export async function manageRoom(identity: WorkshopIdentity & { role: "mc" }, action: "lock" | "reopen" | "end_round" | "end" | "revoke_team", teamId?: string) {
  return invokeArena<{ ok: true; status: string }>("arena-manage-room", { code: identity.roomCode, action, teamId }, authHeaders(identity));
}
export async function startRound(identity: WorkshopIdentity & { role: "mc" }, game: GameId, config: Record<string, unknown>) {
  return invokeArena<{ round: NonNullable<ArenaState["round"]> }>("arena-start-round", { code: identity.roomCode, game, config }, authHeaders(identity));
}
export async function getArenaState(identity: WorkshopIdentity) {
  return invokeArena<ArenaState>("arena-get-state", { code: identity.roomCode, teamId: identity.role === "team" ? identity.teamId : undefined }, authHeaders(identity));
}
export async function submitAccessibility(identity: WorkshopIdentity & { role: "team" }, roundId: string, itemId: string, answerId: string) {
  return invokeArena<{ score: number; duplicate?: boolean }>("arena-submit-accessibility", { roundId, teamId: identity.teamId, itemId, answerId, idempotencyKey: `${roundId}:${identity.teamId}:${itemId}` }, authHeaders(identity));
}
export async function submitRobot(identity: WorkshopIdentity & { role: "team" }, roundId: string, itemId: string, commands: RobotCommand[]) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(commands.join(",")));
  const commandHash = Array.from(new Uint8Array(digest)).slice(0, 12).map((value) => value.toString(16).padStart(2, "0")).join("");
  return invokeArena<{ score: number; duplicate?: boolean }>("arena-submit-robot", { roundId, teamId: identity.teamId, itemId, commands, idempotencyKey: `${roundId}:${identity.teamId}:${itemId}:${commandHash}` }, authHeaders(identity));
}

export function teamsFromState(state: ArenaState): Team[] { const scoreByTeam = new Map(state.scores.map((score) => [score.team_id, score.score])); return state.teams.map((team, index) => ({ id: team.id, name: team.name, score: scoreByTeam.get(team.id) ?? 0, color: colors[index % colors.length], joinedAt: Date.parse(team.created_at) })); }
export function pollArenaState(identity: WorkshopIdentity, onState: (state: ArenaState) => void, onConnection: (status: "online" | "offline" | "error") => void) {
  let disposed = false; let running = false;
  const refresh = async () => { if (disposed || running) return; running = true; try { if (!navigator.onLine) { onConnection("offline"); return; } const state = await getArenaState(identity); if (!disposed) { onState(state); onConnection("online"); } } catch { if (!disposed) onConnection(navigator.onLine ? "error" : "offline"); } finally { running = false; } };
  void refresh(); const interval = window.setInterval(refresh, ARENA_POLL_INTERVAL_MS); const online = () => void refresh(); window.addEventListener("online", online);
  return () => { disposed = true; window.clearInterval(interval); window.removeEventListener("online", online); };
}

export const makeRoomCode = () => { const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const bytes = crypto.getRandomValues(new Uint8Array(6)); return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join(""); };
export const seedTeams: Team[] = [
  { id: "team-1", name: "Pixel Pioneers", color: colors[0], score: 420, joinedAt: Date.now() - 1000 },
  { id: "team-2", name: "Bug Busters", color: colors[1], score: 360, joinedAt: Date.now() - 800 },
  { id: "team-3", name: "Code Cà Phê", color: colors[2], score: 290, joinedAt: Date.now() - 600 },
];
