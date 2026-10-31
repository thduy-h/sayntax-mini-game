import { assertEquals, assertThrows, assert } from "jsr:@std/assert@1";
import {
  competitionConfig,
  competitionAnswer,
  competitionRobotScore,
  shortestCommands,
  tieAnswer,
  tieQuestion,
} from "./competition-content.ts";
import { ROBOT_LEVELS } from "./canonical.ts";
import { verifyCompetitionSubmission } from "./competition-api.ts";
Deno.test(
  "competition all 12 variants have three plausible options, exactly 100/50/0 and no public key",
  () => {
    for (const id of [
      "contrast",
      "keyboard",
      "captions",
      "language",
      "touch",
      "color",
      "time",
      "motion",
      "alt",
      "plain",
      "audio",
      "navigation",
    ]) {
      const cfg = competitionConfig(1, {
        scenarioIds: [
          id,
          ...["contrast", "keyboard", "captions", "language", "touch", "color", "navigation"]
            .filter((x) => x !== id)
            .slice(0, 5),
        ],
      });
      const q = cfg.questions![0];
      assertEquals(q.options.length, 3);
      assertEquals(
        q.options.map((o) => competitionAnswer(id, o.id)).sort((a, b) => a - b),
        [0, 50, 100],
      );
      const publicText = JSON.stringify(q);
      for (const forbidden of [
        "correct",
        "scores",
        "explanation",
        "best",
        "partial",
        "harmful",
      ])
        assert(!publicText.includes(`"${forbidden}"`));
    }
  },
);
Deno.test(
  "frozen preset reproducible and limits exactly six questions / four curated maps",
  () => {
    assertEquals(competitionConfig(1, {}), competitionConfig(1, {}));
    assertEquals(competitionConfig(2, {}), competitionConfig(2, {}));
    assertThrows(() => competitionConfig(1, { scenarioIds: ["contrast"] }));
    assertThrows(() => competitionConfig(2, { levelIds: ["6", "6", "7"] }));
    const maps = competitionConfig(2, {}).maps!;
    assertEquals(
      maps.map((m) => m.id),
      ["1", "2", "6", "4"],
    );
    for (const m of maps) {
      assert(!Object.hasOwn(m, "par"));
      assert(!Object.hasOwn(m, "optimalCommands"));
    }
  },
);
Deno.test(
  "BFS guarantees shortest reference for all nine authoritative maps",
  () => {
    for (const [id, map] of Object.entries(ROBOT_LEVELS)) {
      const path = shortestCommands(map);
      assert(path.length <= 24);
      const { trace, ...scoring } = competitionRobotScore(id, path);
      assertEquals(trace.at(-1)?.goal, true);
      assertEquals(scoring, {
        successful: true,
        score: 100,
        executed: path.length,
        optimalCommands: path.length,
      });
      assertEquals(path.length, map.par);
    }
  },
);
Deno.test(
  "competition Robot stops at first destination, failure zero, retry candidates never sum",
  () => {
    const path = shortestCommands(ROBOT_LEVELS["6"]);
    assertEquals(
      competitionRobotScore("6", [...path, "left", "forward"]).score,
      100,
    );
    assertEquals(
      competitionRobotScore("6", [...path, "left", "forward"]).executed,
      path.length,
    );
    assertEquals(
      competitionRobotScore("6", ["left", "right", ...path]).score,
      84,
    );
    assertEquals(
      competitionRobotScore("6", [
        "left",
        "right",
        "left",
        "right",
        "left",
        "right",
        ...path,
      ]).score,
      60,
    );
    assertEquals(competitionRobotScore("6", []).score, 0);
    assertThrows(() => competitionRobotScore("6", Array(25).fill("forward")));
    assertThrows(() => competitionRobotScore("6", ["repeat"]));
  },
);
Deno.test(
  "verified alternative route with one extra executed command earns92",
  () => {
    const program = [
      "left",
      "forward",
      "forward",
      "forward",
      "right",
      "forward",
      "forward",
      "forward",
      "forward",
      "forward",
      "left",
      "forward",
      "forward",
    ];
    assertEquals(shortestCommands(ROBOT_LEVELS["7"]).length, 12);
    const { trace, ...scoring } = competitionRobotScore("7", program);
    assertEquals(trace.length, 14);
    assertEquals(trace.at(-1)?.goal, true);
    assertEquals(scoring, {
      successful: true,
      score: 92,
      executed: 13,
      optimalCommands: 12,
    });
  },
);
Deno.test(
  "submission ignores client XP, par and client map; validates frozen IDs/version",
  () => {
    const config = competitionConfig(1, { scenarioIds: ["contrast", "keyboard", "captions", "language", "color", "time"] });
    const result = verifyCompetitionSubmission(
      "accessibility",
      { itemId: "contrast", answerId: "o2", xp: 999 },
      { content_version: "competition-v2-1", config },
    );
    assertEquals(result.score, 100);
    assertThrows(() =>
      verifyCompetitionSubmission(
        "accessibility",
        { itemId: "touch", answerId: "o1" },
        { content_version: "competition-v2-1", config },
      ),
    );
    assertThrows(() =>
      verifyCompetitionSubmission(
        "accessibility",
        { itemId: "contrast", answerId: "best" },
        { content_version: "competition-v2-1", config },
      ),
    );
    assertThrows(() =>
      verifyCompetitionSubmission(
        "accessibility",
        { itemId: "contrast", answerId: "o2" },
        { content_version: "wrong", config },
      ),
    );
    const r = verifyCompetitionSubmission(
      "robot",
      {
        itemId: "6",
        commands: shortestCommands(ROBOT_LEVELS["6"]),
        par: 0,
        xp: 999,
        map: {},
      },
      { content_version: "competition-v2-1", config: competitionConfig(2, {}) },
    );
    assertEquals(r.score, 100);
  },
);
Deno.test(
  "sudden death is deterministic, opaque and has bounded validated answers",
  () => {
    assertEquals(tieQuestion(1), tieQuestion(1));
    assertEquals(
      ["o1", "o2", "o3"].map((x) => tieAnswer(1, x)),
      [50, 100, 0],
    );
    assertThrows(() => tieAnswer(0, "o1"));
    assertThrows(() => tieAnswer(1, "wrong"));
    assert(!JSON.stringify(tieQuestion(1)).includes('"scores"'));
  },
);

Deno.test(
  "V2 Edge transport uses atomic RPC and neutral Accessibility confirmation",
  async () => {
    const { submit } = await import("./submit-handler.ts");
    const { sha256 } = await import("./db.ts");
    const oldFetch = globalThis.fetch;
    const names = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
    const oldEnv = names.map((n) => Deno.env.get(n));
    Deno.env.set(names[0], "https://competition.invalid");
    Deno.env.set(names[1], "synthetic-service-key");
    const calls: Array<{ path: string; payload: Record<string, unknown> }> = [];
    let denied = false;
    globalThis.fetch = (async (url, init) => {
      const path = new URL(String(url)).pathname,
        payload = init?.body ? JSON.parse(String(init.body)) : {};
      calls.push({ path, payload });
      let data: unknown;
      if (path.endsWith("/consume_rate_limit")) data = true;
      else if (path.endsWith("/teams"))
        data = {
          room_id: "room",
          join_token_hash: await sha256("synthetic-team-token"),
        };
      else if (path.endsWith("/rounds"))
        data = {
          room_id: "room",
          game: "accessibility",
          config: competitionConfig(1, { scenarioIds: ["contrast", "keyboard", "captions", "language", "color", "time"] }),
          content_version: "competition-v2-1",
        };
      else if (path.endsWith("/process_submission")) {
        if (denied)
          return new Response(
            JSON.stringify({ message: "stage_closed", code: "P0001" }),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        data = { accepted: true, duplicate: false };
      } else throw new Error(`Unexpected V2 write/read: ${path}`);
      return new Response(JSON.stringify(data), {
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;
    const request = () =>
      new Request("https://competition.invalid", {
        method: "POST",
        headers: { "x-team-token": "synthetic-team-token" },
        body: JSON.stringify({
          roundId: "round",
          teamId: "team",
          itemId: "contrast",
          answerId: "o2",
          idempotencyKey: "stable",
          score: 99999,
          optimalCommands: 0,
        }),
      });
    try {
      const response = await submit(request(), "accessibility");
      assertEquals(response.status, 200);
      assertEquals(await response.json(), { accepted: true, duplicate: false });
      const write = calls.find((c) => c.path.endsWith("/process_submission"))!;
      assertEquals(write.payload.p_score, 100);
      assertEquals(write.payload.p_content_version, "competition-v2-1");
      assertEquals(write.payload.p_config, competitionConfig(1, { scenarioIds: ["contrast", "keyboard", "captions", "language", "color", "time"] }));
      assertEquals(
        calls.filter((c) => c.path.includes("/rpc/")).map((c) => c.path),
        ["/rest/v1/rpc/consume_rate_limit", "/rest/v1/rpc/process_submission"],
      );
      // State may close after prechecks; transactional rejection must reach caller.
      denied = true;
      let error = "";
      try {
        await submit(request(), "accessibility");
      } catch (e) {
        error = (e as Error).message;
      }
      assertEquals(error, "stage_closed");
    } finally {
      globalThis.fetch = oldFetch;
      names.forEach((n, i) =>
        oldEnv[i] === undefined
          ? Deno.env.delete(n)
          : Deno.env.set(n, oldEnv[i]!),
      );
    }
  },
);

Deno.test(
  "shared presentation budget admits nine polling screens without exposing private fields",
  async () => {
    const { competitionState } = await import("./competition-api.ts");
    const oldFetch = globalThis.fetch,
      names = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      oldEnv = names.map((n) => Deno.env.get(n));
    Deno.env.set(names[0], "https://competition.invalid");
    Deno.env.set(names[1], "synthetic-service-key");
    const buckets = new Map<string, number>();
    globalThis.fetch = (async (url, init) => {
      const path = new URL(String(url)).pathname,
        payload = JSON.parse(String(init?.body));
      let data: unknown;
      if (path.endsWith("/consume_rate_limit")) {
        const count = (buckets.get(payload.p_key) ?? 0) + 1;
        buckets.set(payload.p_key, count);
        data = count <= payload.p_limit;
      } else if (path.endsWith("/competition_state")) {
        assertEquals(payload.p_role, "presentation");
        data = { role: "presentation", stages: [] };
      } else throw new Error(`Unexpected spectator operation: ${path}`);
      return new Response(JSON.stringify(data), {
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;
    try {
      for (let i = 0; i < 9 * 12; i++) {
        const response = await competitionState(
          new Request("https://competition.invalid", {
            headers: { "x-forwarded-for": "192.0.2.1" },
          }),
          {
            competitionId: "90000000-0000-0000-0000-000000000001",
            presentationToken: "synthetic-spectator-capability",
          },
        );
        assertEquals(response.status, 200);
        assertEquals(await response.json(), {
          role: "presentation",
          stages: [],
        });
      }
      assertEquals([...buckets.values()], [108, 108]);
    } finally {
      globalThis.fetch = oldFetch;
      names.forEach((n, i) =>
        oldEnv[i] === undefined
          ? Deno.env.delete(n)
          : Deno.env.set(n, oldEnv[i]!),
      );
    }
  },
);

Deno.test(
  "V3 MC progression and demo forward stage/index to the invoker RPC",
  async () => {
    const { competitionControl } = await import("./competition-api.ts");
    const oldFetch = globalThis.fetch;
    const names = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      oldEnv = names.map((n) => Deno.env.get(n));
    Deno.env.set(names[0], "https://competition.invalid");
    Deno.env.set(names[1], "synthetic-service-key");
    const calls: Record<string, unknown>[] = [];
    globalThis.fetch = (async (url, init) => {
      const payload = JSON.parse(String(init?.body));
      if (String(url).endsWith("/competition_control")) {
        calls.push(payload);
        return Response.json({ ok: true });
      }
      if (String(url).endsWith("/consume_rate_limit"))
        return Response.json(true);
      throw new Error("unexpected V3 write");
    }) as typeof fetch;
    try {
      for (const action of [
        "show_demo",
        "advance_challenge",
        "close_challenge",
      ])
        await competitionControl(
          new Request("https://competition.invalid", {
            headers: { "x-mc-token": "synthetic-mc-capability" },
          }),
          {
            competitionId: "90000000-0000-0000-0000-000000000001",
            action,
            stage: 1,
            index: 2,
          },
        );
      assertEquals(
        calls.map((c) => [c.p_action, c.p_stage, c.p_index]),
        [
          ["show_demo", 1, null],
          ["advance_challenge", 1, 2],
          ["close_challenge", 1, 2],
        ],
      );
    } finally {
      globalThis.fetch = oldFetch;
      names.forEach((n, i) =>
        oldEnv[i] === undefined
          ? Deno.env.delete(n)
          : Deno.env.set(n, oldEnv[i]!),
      );
    }
  },
);

Deno.test(
  "V3 code-only resolver is read-only and returns no privileged credentials",
  async () => {
    const { resolveJoinCode } = await import("./competition-api.ts");
    const oldFetch = globalThis.fetch,
      names = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      oldEnv = names.map((n) => Deno.env.get(n));
    Deno.env.set(names[0], "https://competition.invalid");
    Deno.env.set(names[1], "synthetic-service-key");
    let competitionId: string | null = "90000000-0000-0000-0000-000000000001";
    let expires_at = "2099-01-01T00:00:00Z";
    globalThis.fetch = (async (url, init) => {
      const u = new URL(String(url));
      if (u.pathname.endsWith("/consume_rate_limit"))
        return Response.json(true);
      assertEquals(u.pathname, "/rest/v1/rooms");
      assertEquals(init?.method, "GET");
      assertEquals(u.searchParams.get("select"), "competition_id,expires_at");
      return Response.json({ competition_id: competitionId, expires_at });
    }) as typeof fetch;
    try {
      const request = new Request("https://competition.invalid");
      assertEquals(
        await (await resolveJoinCode(request, { code: "ABC234" })).json(),
        { mode: "competition", competitionId },
      );
      competitionId = null;
      assertEquals(
        await (await resolveJoinCode(request, { code: "ABC234" })).json(),
        { mode: "workshop" },
      );
      expires_at = "2000-01-01T00:00:00Z";
      let rejected = false;
      try {
        await resolveJoinCode(request, { code: "ABC234" });
      } catch (e) {
        rejected = e instanceof Error && e.message === "not_found";
      }
      assert(rejected);
    } finally {
      globalThis.fetch = oldFetch;
      names.forEach((n, i) =>
        oldEnv[i] === undefined
          ? Deno.env.delete(n)
          : Deno.env.set(n, oldEnv[i]!),
      );
    }
  },
);
