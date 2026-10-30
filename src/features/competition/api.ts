import { ArenaApiError, authHeaders, invokeArena } from "../../lib/workshop";
import type { CompetitionState, Identity } from "./types";
import { parseCreatedCompetition } from "./contracts";
export async function createCompetition(name: string) {
  const response = await invokeArena<unknown>("arena-create-room", {
    mode: "competition",
    name,
  });
  const result = parseCreatedCompetition(response);
  if (!result) throw new ArenaApiError("competition_backend_outdated");
  return result;
}
export const capability = () =>
  crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
const key = (id: string, role: string, stage?: number) =>
  `arena-competition-v2:${id}:${role}:${stage ?? "mc"}`;
export function saveCompetitionIdentity(value: Identity) {
  sessionStorage.setItem(
    key(value.competitionId, value.role, value.stage),
    JSON.stringify(value),
  );
}
export function clearCompetitionIdentity(value: Identity) {
  sessionStorage.removeItem(key(value.competitionId, value.role, value.stage));
}
export function loadCompetitionIdentity(
  id: string,
  role: "mc" | "team",
  stage?: number,
): Identity | null {
  try {
    const raw = sessionStorage.getItem(key(id, role, stage));
    const value = raw ? JSON.parse(raw) : null;
    return value?.competitionId === id && value?.role === role ? value : null;
  } catch {
    return null;
  }
}
export const headers = (identity: Identity) =>
  authHeaders({
    role: identity.role,
    token: identity.token,
    roomCode: identity.code ?? "",
    ...(identity.role === "team"
      ? { teamId: identity.teamId!, teamName: "" }
      : {}),
  } as Parameters<typeof authHeaders>[0]);
export const getCompetitionState = (identity: Identity) =>
  invokeArena<CompetitionState>(
    "arena-get-state",
    { competitionId: identity.competitionId, teamId: identity.teamId },
    headers(identity),
  );
export const controlCompetition = (
  identity: Identity,
  action: string,
  extra: Record<string, unknown> = {},
) =>
  invokeArena<{ ok: boolean; presentationToken?: string }>(
    action === "start_stage" ? "arena-start-round" : "arena-manage-room",
    { competitionId: identity.competitionId, action, ...extra },
    headers(identity),
  );
export function resolvePublicJoinOrigin(): string {
  const envUrl = (
    import.meta.env.VITE_PUBLIC_APP_URL ||
    import.meta.env.VITE_APP_URL
  ) as string | undefined;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  return typeof window !== "undefined" ? window.location.origin : "";
}

export function isValidJoinUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.pathname.includes("/join/")
    );
  } catch {
    return false;
  }
}

export function isLocalDevUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local") ||
      host.includes("preview.local")
    );
  } catch {
    return false;
  }
}

export const joinLink = (_id: string, code: string) =>
  `${resolvePublicJoinOrigin()}/join/${encodeURIComponent(code)}`;
export const presentationLink = (id: string, token: string) =>
  `${resolvePublicJoinOrigin()}/present/${id}#token=${encodeURIComponent(token)}`;
export function downloadCard(text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "SAYNTAX-team-recovery.txt";
  a.click();
  URL.revokeObjectURL(url);
}
