import { assertEquals, assertThrows, assert } from "jsr:@std/assert@1";
import { competitionConfig, shortestCommands } from "./competition-content.ts";
import { ROBOT_LEVELS } from "./canonical.ts";
import { verifyCompetitionSubmission, competitionControl } from "./competition-api.ts";

Deno.test("V5 canonical verification ignores forged XP, optimal count, execution count and trace", () => {
  const round = { content_version: "competition-v5-1", config: competitionConfig(2, {}) };
  for (const itemId of ["1", "2", "6", "4"]) {
    const path = shortestCommands(ROBOT_LEVELS[itemId]);
    const verified = verifyCompetitionSubmission("robot", { itemId, commands: [...path, "left"], xp: 999, optimalCommands: 0, verification: { commandsUsed: 0 } }, round);
    assertEquals(verified.score, 100);
    assertEquals(verified.payload, { commands: [...path, "left"], optimization: false, verification: { commandsUsed: path.length, optimalCommands: path.length } });
    const extra = verifyCompetitionSubmission("robot", { itemId, commands: ["left", "right", ...path], optimization: true }, round);
    assertEquals(extra.score, 84);
    assertEquals(extra.payload.optimization, true);
  }
  assertThrows(() => verifyCompetitionSubmission("robot", { itemId: "1", commands: [] }, round));
  assertThrows(() => verifyCompetitionSubmission("robot", { itemId: "7", commands: ["forward"] }, round));
});

Deno.test("V5 demo and ceremony control forwards allowlisted fields, MC hash and version only", async () => {
  const original = globalThis.fetch;
  Deno.env.set("SUPABASE_URL", "https://v5.synthetic.invalid");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "synthetic-service-key");
  const calls: Record<string, unknown>[] = [];
  globalThis.fetch = (async (url, init) => {
    if (String(url).endsWith("/consume_rate_limit")) return Response.json(true);
    if (!String(url).endsWith("/competition_control")) throw Error("Unexpected RPC");
    calls.push(JSON.parse(String(init?.body))); return Response.json({ ok: true });
  }) as typeof fetch;
  const request = () => new Request("https://v5.synthetic.invalid", { headers: { "x-mc-token": "synthetic-mc-credential" } });
  const common = { competitionId: "90000000-0000-0000-0000-000000000001" };
  try {
    await competitionControl(request(), { ...common, action: "robot_demo", demo: { op: "queue", version: 3, commands: ["forward"], trace: [{ fake: true }], score: 999 } });
    assertEquals(calls[0].p_config, { op: "queue", version: 3, commands: ["forward"] });
    assert(typeof calls[0].p_hash === "string" && calls[0].p_hash.length === 64);
    await competitionControl(request(), { ...common, action: "ceremony", phase: "ranking", expectedPhase: "intro", winner: "forged" });
    assertEquals(calls[1].p_config, { phase: "ranking", expectedPhase: "intro" });
    let rejected = false;
    try { await competitionControl(request(), { ...common, action: "robot_demo", demo: { op: "queue", version: -1 } }); } catch { rejected = true; }
    assert(rejected); assertEquals(calls.length, 2);
  } finally { globalThis.fetch = original; }
});
