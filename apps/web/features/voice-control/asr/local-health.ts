import type { LocalASRHealth } from "./types";
import { logASR } from "./config";

const HEALTH_CACHE_MS = 10_000;

let cachedHealth: { checkedAt: number; result: LocalASRHealth | null; url: string } | null = null;

export async function checkLocalASRHealth(
  baseUrl: string,
  timeoutMs: number,
  options: { force?: boolean } = {},
): Promise<LocalASRHealth | null> {
  const normalizedUrl = baseUrl.replace(/\/+$/, "");
  if (
    !options.force &&
    cachedHealth &&
    cachedHealth.url === normalizedUrl &&
    Date.now() - cachedHealth.checkedAt < HEALTH_CACHE_MS
  ) {
    return cachedHealth.result;
  }

  logASR("Checking local server");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${normalizedUrl}/health`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`health ${response.status}`);
    const data = (await response.json()) as LocalASRHealth;
    const result = data.status === "ok" ? data : null;
    cachedHealth = { checkedAt: Date.now(), result, url: normalizedUrl };
    if (result) logASR("Local server available");
    return result;
  } catch {
    cachedHealth = { checkedAt: Date.now(), result: null, url: normalizedUrl };
    logASR("Local unavailable, falling back to browser");
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}
