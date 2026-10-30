import type { admin } from "./db.ts";
export async function rateLimit(db: ReturnType<typeof admin>, key: string, limit: number, windowSeconds: number) { const { data, error } = await db.rpc("consume_rate_limit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds }); if (error) throw new Error("rate_limit_failed"); if (!data) throw new Error("rate_limited"); }
