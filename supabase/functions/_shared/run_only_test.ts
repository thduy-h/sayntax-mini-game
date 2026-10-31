import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import { freezeOfficialRobotConfig, frozenRobotLevel, shortestCommands, competitionRobotScore } from "./competition-content.ts";
import { ROBOT_LEVELS } from "./canonical.ts";
import { verifyCompetitionSubmission } from "./competition-api.ts";
import { submit } from "./submit-handler.ts";
import { sha256 } from "./db.ts";

Deno.test("run-only maps are frozen server-side, progressive, separate from every public practice map", () => {
  const layouts = new Set<string>();
  for (let run = 0; run < 20; run++) {
    const config = freezeOfficialRobotConfig({ levelIds: ["1", "2", "6", "4"], maps: [], seed: "attacker" });
    assertEquals(config.executionPolicy, "run-only-v1");
    assertEquals(config.maps.length, 4);
    config.maps.forEach((map, index) => {
      const level = frozenRobotLevel(config, map.id), solution = shortestCommands(level);
      assert(solution.length >= 7 + index * 2 && solution.length <= 11 + index * 2);
      assert(!Object.values(ROBOT_LEVELS).some(l => [...l.walls].sort().join(";") === [...map.walls].sort().join(";")));
      const round = { content_version: "competition-v5-1", config };
      const verified = verifyCompetitionSubmission("robot", { itemId: map.id, commands: solution, xp: 999, optimalCommands: 0, trace: [] }, round);
      assertEquals(verified.score, 100);
      assertEquals(verified.payload.verification?.commandsUsed, solution.length);
      assertEquals(competitionRobotScore(map.id, solution, level).trace.at(-1)?.goal, true);
      assertEquals(verifyCompetitionSubmission("robot", { itemId: map.id, commands: solution }, round), verified);
    });
    layouts.add(JSON.stringify(config.maps));
  }
  assertEquals(layouts.size, 20);
  assertThrows(() => frozenRobotLevel({ maps: [] }, "1"));
});

Deno.test("official trace is gated by committed attempt; collision counts; forged preview/step fields grant no bypass", async () => {
  const original = globalThis.fetch;
  Deno.env.set("SUPABASE_URL", "https://run-only.synthetic.invalid");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "synthetic-service-key");
  const credential = "synthetic-team-credential", hash = await sha256(credential);
  const config = { levelIds: ["1"], maps: [] };
  let reject = true, calls = 0, payload: Record<string, unknown> | null = null;
  globalThis.fetch = (async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("consume_rate_limit")) return Response.json(true);
    if (path.endsWith("/teams")) return Response.json({ room_id: "room", join_token_hash: hash });
    if (path.endsWith("/rounds")) return Response.json({ room_id: "room", game: "robot", config, content_version: "competition-v5-1" });
    if (path.endsWith("process_submission")) {
      calls++; payload = JSON.parse(String(init?.body));
      if (reject) return Response.json({ message: "inactive_challenge", code: "P0001" }, { status: 400 });
      return Response.json({ accepted: true, verified: false, level: { officialRuns: 1, isOptimal: false, optimalCommands: 4 }, score: 0 });
    }
    throw new Error("Unexpected request");
  }) as typeof fetch;
  const request = (commands: string[]) => new Request("https://run-only.synthetic.invalid", { method: "POST", headers: { "x-team-token": credential }, body: JSON.stringify({ roundId: "round", teamId: "team", itemId: "1", commands, idempotencyKey: "same-key", preview: true, action: "step", optimalCommands: 0, xp: 999 }) });
  try {
    let error = "";
    try { await submit(request(["forward"]), "robot"); } catch (e) { error = (e as Error).message; }
    assertEquals(error, "inactive_challenge"); assertEquals(calls, 1);
    reject = false;
    const response = await submit(request(["right", "forward", "forward"]), "robot");
    const result = await response.json();
    assertEquals(response.status, 200); assertEquals(calls, 2);
    assertEquals(result.execution.trace.at(-1).blocked, true);
    assertEquals(result.level.officialRuns, 1);
    assert(!("isOptimal" in result.level)); assert(!("optimalCommands" in result.level));
    assertEquals((payload as unknown as { p_payload: { verification: { commandsUsed: number } } }).p_payload.verification.commandsUsed, 3);
    assert(!JSON.stringify(result).includes("optimal"));
    await submit(new Request("https://run-only.synthetic.invalid", { method: "POST", headers: { "x-team-token": "spectator-credential" }, body: JSON.stringify({ roundId: "round", teamId: "team", itemId: "1", commands: ["forward"], idempotencyKey: "spectator" }) }), "robot").then(() => { throw Error("spectator accepted"); }, e => assertEquals(e.message, "forbidden"));
    assertEquals(calls, 2);
  } finally { globalThis.fetch = original; }
});
