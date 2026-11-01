import { competitionControl } from "./competition-api.ts";

Deno.test("display control forwards hashed MC authorization, exact mode and scope via one RPC", async () => {
  Deno.env.set("SUPABASE_URL", "https://synthetic.invalid");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "synthetic-test-key");
  const original = globalThis.fetch;
  const calls: Record<string, unknown>[] = [];
  globalThis.fetch = (async (url, init) => {
    if (String(url).endsWith("/consume_rate_limit")) return Response.json(true);
    if (!String(url).endsWith("/competition_control")) throw Error("Unexpected destination");
    calls.push(JSON.parse(String(init?.body)));
    return Response.json({ ok: true });
  }) as typeof fetch;
  try {
    await competitionControl(new Request("https://synthetic.invalid", { headers: { "x-mc-token": "synthetic-mc-credential" } }), {
      competitionId: "90000000-0000-0000-0000-000000000001", action: "set_a11y_view", viewMode: "after", viewScope: "demo:1",
    });
    if (calls.length !== 1) throw Error("Expected one atomic control RPC");
    const call = calls[0];
    if (JSON.stringify(call.p_config) !== JSON.stringify({ viewMode: "after", viewScope: "demo:1" })) throw Error("Display fields lost");
    if (typeof call.p_hash !== "string" || call.p_hash.length !== 64 || call.p_stage !== null) throw Error("Invalid MC authorization/scope");
    for (const headers of [new Headers(), new Headers({ "x-team-token": "synthetic-team-credential" })]) {
      let rejected = false;
      try { await competitionControl(new Request("https://synthetic.invalid", { headers }), { action: "set_a11y_view" }); }
      catch { rejected = true; }
      if (!rejected) throw Error("Team/missing MC token accepted");
    }
    if (calls.length !== 1) throw Error("Unauthorized request reached RPC");
  } finally { globalThis.fetch = original; }
});

Deno.test("control timeouts and lock contention are retryable busy errors, not a missing V2 backend", async () => {
  Deno.env.set("SUPABASE_URL", "https://synthetic.invalid");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "synthetic-test-key");
  const original = globalThis.fetch;
  try {
    for (const code of ["57014", "55P03", "40P01"]) {
      globalThis.fetch = (async url => String(url).endsWith("/consume_rate_limit")
        ? Response.json(true)
        : Response.json({ code, message: "statement timeout or lock contention" }, { status: 500 })) as typeof fetch;
      let caught = "";
      try {
        await competitionControl(new Request("https://synthetic.invalid", { headers: { "x-mc-token": "synthetic-mc-credential" } }), {
          competitionId: "90000000-0000-0000-0000-000000000001", action: "finalize_stage", stage: 1,
        });
      } catch (error) { caught = (error as Error).message; }
      if (caught !== "competition_busy") throw Error(`Wrong classification for ${code}: ${caught}`);
    }
  } finally { globalThis.fetch = original; }
});
