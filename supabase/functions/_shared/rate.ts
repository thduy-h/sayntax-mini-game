import type { admin } from "./db.ts";

// Shared workshop Wi-Fi: many phones use the same public IP.
export const COMPETITION_JOIN_IP_LIMIT = 120; // requests/IP/room/minute
export const RECOVERY_IP_LIMIT = 40; // requests/IP/10 minutes
export const RECOVERY_TEAM_LIMIT = 5; // requests/competition-team/10 minutes
export const RECOVERY_WINDOW_SECONDS = 600;

export class RateLimitedError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("rate_limited");
    this.name = "RateLimitedError";
  }
}

export function remainingRateLimitSeconds(
  startedAt: string | null | undefined,
  windowSeconds: number,
  nowMillis = Date.now(),
): number {
  const started = Date.parse(startedAt ?? "");
  if (!Number.isFinite(started)) return windowSeconds;
  return Math.max(1, Math.min(windowSeconds,
    Math.ceil((started + windowSeconds * 1000 - nowMillis) / 1000)));
}

export async function rateLimit(
  db: ReturnType<typeof admin>,
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const { data, error } = await db.rpc("consume_rate_limit", {
    p_key: key, p_limit: limit, p_window_seconds: windowSeconds,
  });
  if (error) throw new Error("rate_limit_failed");
  if (data) return;

  // Extra lookup is performed only on rejected requests, not on successful traffic.
  const { data: window } = await db.from("rate_limits")
    .select("window_started_at").eq("key", key).maybeSingle();
  throw new RateLimitedError(remainingRateLimitSeconds(window?.window_started_at, windowSeconds));
}
