import { assertEquals, assert, assertRejects } from "jsr:@std/assert@1";
import type { admin } from "./db.ts";
import {
  COMPETITION_JOIN_IP_LIMIT, RECOVERY_IP_LIMIT, RECOVERY_TEAM_LIMIT,
  RECOVERY_WINDOW_SECONDS, RateLimitedError, rateLimit, remainingRateLimitSeconds,
} from "./rate.ts";

Deno.test("workshop Wi-Fi budgets support 8 teams while bounding team recovery", () => {
  assertEquals(COMPETITION_JOIN_IP_LIMIT, 120);
  assertEquals(RECOVERY_IP_LIMIT, 40);
  assertEquals(RECOVERY_TEAM_LIMIT, 5);
  assertEquals(RECOVERY_WINDOW_SECONDS, 600);
});

Deno.test("rate limit window supplies a bounded retry duration", () => {
  const base = Date.parse("2026-11-01T04:00:00Z");
  assertEquals(remainingRateLimitSeconds("2026-11-01T04:00:00Z", 600, base + 90_000), 510);
  assertEquals(remainingRateLimitSeconds("2026-11-01T04:00:00Z", 600, base + 599_200), 1);
  assertEquals(remainingRateLimitSeconds(null, 600, base), 600);
});

Deno.test("a blocked request returns rate_limited and Retry-After duration", async () => {
  const base = Date.now();
  const mock = {
    rpc: async () => ({ data: false, error: null }),
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { window_started_at: new Date(base - 90_000).toISOString() },
          }),
        }),
      }),
    }),
  } as unknown as ReturnType<typeof admin>;
  const err = await assertRejects(
    () => rateLimit(mock, "synthetic-key", RECOVERY_IP_LIMIT, RECOVERY_WINDOW_SECONDS),
    RateLimitedError, "rate_limited",
  );
  assert(err.retryAfterSeconds >= 508 && err.retryAfterSeconds <= 510);
});

Deno.test("allowed requests do not query rate_limits table", async () => {
  const mock = {
    rpc: async () => ({ data: true, error: null }),
    from: () => { throw Error("unexpected SELECT"); },
  } as unknown as ReturnType<typeof admin>;
  await rateLimit(mock, "synthetic-key", 40, 600);
});
