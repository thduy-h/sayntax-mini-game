import { assertEquals, assertRejects, assertThrows } from "jsr:@std/assert@1";
import { CONTENT_VERSION, verifySubmission } from "./submission.ts";
import { ROBOT_LEVELS } from "./canonical.ts";
import { submit } from "./submit-handler.ts";

Deno.test("trusted scoring ignores client XP and rejects invalid options/version/programs", () => {
  const round = { config: { scenarioIds: ["contrast"] }, content_version: CONTENT_VERSION };
  assertEquals(verifySubmission("accessibility", { itemId: "contrast", answerId: "contrast", score: 99999 }, round).score, 100);
  assertEquals(verifySubmission("accessibility", { itemId: "contrast", answerId: "icon" }, round).score, 20);
  for (const answerId of ["missing", "toString", "__proto__"]) assertThrows(() => verifySubmission("accessibility", { itemId: "contrast", answerId }, round));
  assertThrows(() => verifySubmission("accessibility", { itemId: "__proto__", answerId: "best" }, round));
  assertThrows(() => verifySubmission("accessibility", { itemId: "contrast", answerId: "contrast" }, { ...round, content_version: "unknown" }));
  const robot = { config: { levels: ROBOT_LEVELS }, content_version: CONTENT_VERSION };
  assertEquals(verifySubmission("robot", { itemId: "1", commands: ["forward"] }, robot).score, 0);
  assertEquals(verifySubmission("robot", { itemId: "1", commands: Array(4).fill("forward") }, robot).score, 320);
  assertThrows(() => verifySubmission("robot", { itemId: "1", commands: Array(25).fill("forward") }, robot));
  assertThrows(() => verifySubmission("robot", { itemId: "1", commands: ["teleport"] }, robot));
});

// Mocked transport wiring only. Real transaction/concurrency tests live in tests/database.
Deno.test("Edge handler uses one atomic persistence RPC and forwards trusted snapshot/token", async () => {
  const oldFetch = globalThis.fetch;
  const env = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const before = env.map((name) => Deno.env.get(name));
  Deno.env.set(env[0], "https://arena-test.invalid");
  Deno.env.set(env[1], "synthetic-service-key");
  const calls: { path: string; method: string; body: Record<string, unknown> }[] = [];
  let game: "accessibility" | "robot" = "accessibility";
  let denied = false;
  let verified = true;
  const config = () => game === "accessibility" ? { scenarioIds: ["contrast"] } : { levelIds: ["1"], levels: { "1": ROBOT_LEVELS["1"] } };
  globalThis.fetch = (async (url, init) => {
    const path = new URL(String(url)).pathname;
    const parsed = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ path, method: init?.method ?? "GET", body: parsed });
    let data: unknown;
    if (path.endsWith("/rpc/consume_rate_limit")) data = true;
    else if (path.endsWith("/teams")) data = { room_id: "room", join_token_hash: await hash("synthetic-team-token") };
    else if (path.endsWith("/rounds")) data = { room_id: "room", game, config: config(), content_version: CONTENT_VERSION };
    else if (path.endsWith("/rpc/process_submission")) {
      if (denied) return new Response(JSON.stringify({ code: "P0001", message: "forbidden" }), { status: 400, headers: { "content-type": "application/json" } });
      data = { verified, score: verified ? 100 : 0, duplicate: false };
    } else throw new Error(`Unexpected persistence call: ${path}`);
    return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  function request(extra: Record<string, unknown> = {}) {
    return new Request("https://arena-test.invalid", { method: "POST", headers: { "x-team-token": "synthetic-team-token" }, body: JSON.stringify({ roundId: "round", teamId: "team", itemId: game === "accessibility" ? "contrast" : "1", answerId: "contrast", idempotencyKey: "stable", score: 99999, ...extra }) });
  }
  try {
    assertEquals((await submit(request(), game)).status, 200);
    const rpc = calls.find((call) => call.path.endsWith("/rpc/process_submission"))!;
    assertEquals(rpc.body.p_score, 100);
    assertEquals(rpc.body.p_token_hash, await hash("synthetic-team-token"));
    assertEquals(rpc.body.p_config, config());
    assertEquals(rpc.body.p_content_version, CONTENT_VERSION);
    assertEquals(calls.filter((call) => call.method === "POST").map((call) => call.path), ["/rest/v1/rpc/consume_rate_limit", "/rest/v1/rpc/process_submission"]);
    denied = true;
    await assertRejects(() => submit(request(), game), Error, "forbidden");
    denied = false; game = "robot"; verified = false; calls.length = 0;
    assertEquals((await submit(request({ commands: ["forward"] }), game)).status, 422);
    assertEquals(calls.find((call) => call.path.endsWith("/rpc/process_submission"))!.body.p_score, 0);
    assertEquals(calls.filter((call) => call.path.includes("submission_attempts") || call.path.endsWith("/submissions")).length, 0);
  } finally {
    globalThis.fetch = oldFetch;
    env.forEach((name, index) => before[index] === undefined ? Deno.env.delete(name) : Deno.env.set(name, before[index]!));
  }
});
async function hash(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map((v) => v.toString(16).padStart(2, "0")).join("");
}
