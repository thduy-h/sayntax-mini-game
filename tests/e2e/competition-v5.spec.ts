import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { competitionConfig, shortestCommands } from "../../supabase/functions/_shared/competition-content";
import { DEMO_MAP } from "../../src/features/competition/Demo";
import { simulate } from "../../src/features/competition/robotEngine";
import type { Command, CompetitionState, RobotDemoState, RobotLevelSummary } from "../../src/features/competition/types";

import { ROBOT_LEVELS } from "../../supabase/functions/_shared/canonical";

const id = "90000000-0000-0000-0000-000000000005";
const configs = [competitionConfig(1), competitionConfig(2)];
const firstLevel: RobotLevelSummary = { itemId: "1", canonicalVersion: "competition-v5-1", successful: true, firstCommands: 6, bestCommands: 6, bestBaseScore: 84, officialRuns: 1, optimizationAttempts: 0, penalty: 0, finalScore: 84, isOptimal: false };

test("V5 live teaching -> paid optimization -> private results -> manually revealed awards", async ({ browser }, info) => {
  test.setTimeout(150_000);
  const dir = "artifacts/ui-review/v5"; await mkdir(dir, { recursive: true });
  const options = { viewport: info.project.use.viewport, isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch };
  const contexts = await Promise.all([browser.newContext(options), browser.newContext(options), browser.newContext(options)]);
  let demoStage: number | null = 2, active = false, finalized = false, index = 0, closed = false;
  let phase: NonNullable<CompetitionState["ceremonyPhase"]> = "waiting";
  let demo: RobotDemoState = { version: 0, status: "idle", commands: [], trace: simulate(DEMO_MAP, []), currentStepIndex: 0, explanation: false };
  let level = { ...firstLevel };
  const seenKeys = new Set<string>(), writes: string[] = [];
  const snapshots: { role: string; state: Record<string, unknown> }[] = [];
  const demoNow = () => {
    const now = Date.now();
    const step = demo.status === "running" ? Math.min(demo.trace.length - 1, demo.currentStepIndex + Math.floor((now - Date.parse(demo.startedAt!)) / 500)) : demo.currentStepIndex;
    return { ...demo, playbackOriginStep: demo.currentStepIndex, currentStepIndex: step, serverNow: new Date(now).toISOString() };
  };
  const board = () => [{ teamId: "ct-alpha", name: "Synthetic Alpha", accessibility: 600, robot: 395, accessibility50: 50, robot50: 49.375, final100: 99.375, rank: 1, perfectAccessibility: 6, optimalRobot: 4, officialRobotRuns: 5 }, { teamId: "ct-beta", name: "Synthetic Beta", accessibility: 450, robot: 336, accessibility50: 37.5, robot50: 42, final100: 79.5, rank: 2, perfectAccessibility: 3, optimalRobot: 0, officialRobotRuns: 4 }];
  const explanations = () => board().map(t => ({ teamId: t.teamId, name: t.name, totals: t,
    accessibility: configs[0].questions!.map((q, i) => ({ itemId: q.id, label: q.title, score: t.rank === 1 ? 100 : i < 3 ? 100 : 50, maximum: 100 })),
    robot: configs[1].maps!.map((m, i) => {
      const optimal = shortestCommands(ROBOT_LEVELS[m.id]).length;
      return { ...level, itemId: m.id, label: m.name, optimalCommands: optimal,
        firstCommands: t.rank === 1 ? i === 0 ? 6 : optimal : optimal + 2,
        bestCommands: t.rank === 1 ? optimal : optimal + 2,
        bestBaseScore: t.rank === 1 ? 100 : 84, isOptimal: t.rank === 1, extraCommands: t.rank === 1 ? 0 : 2,
        officialRuns: t.rank === 1 && i === 0 ? 2 : 1,
        finalScore: t.rank === 1 ? i === 0 ? 95 : 100 : 84,
        penalty: t.rank === 1 && i === 0 ? 5 : 0,
        optimizationAttempts: t.rank === 1 && i === 0 ? 1 : 0 };
    }),
  }));
  try {
    for (const [n, context] of contexts.entries()) {
      const role = ["mc", "presentation", "team"][n];
      await context.addInitScript(({ id, role }) => {
        if (role !== "presentation") sessionStorage.setItem(`arena-competition-v2:${id}:${role}:${role === "team" ? 2 : "mc"}`, JSON.stringify({ competitionId: id, role, token: `synthetic-${role}-credential`, stage: role === "team" ? 2 : undefined, teamId: role === "team" ? "team-alpha" : undefined }));
      }, { id, role });
      await context.route("**/functions/v1/**", async route => {
        const input = route.request().postDataJSON(); const endpoint = route.request().url().split("/").pop();
        if (endpoint === "arena-join-room") return route.fulfill({ json: { mode: "competition", competitionId: id, name: "V5 rehearsal", stage: 2, status: "STAGE_1_FINALIZED" } });
        if (endpoint === "arena-submit-robot") {
          expect(role).toBe("team"); expect(input.optimization).toBe(true); expect(input.commands).toEqual(Array(4).fill("forward"));
          if (!seenKeys.has(input.idempotencyKey)) { seenKeys.add(input.idempotencyKey); level = { ...level, bestCommands: 4, bestBaseScore: 100, officialRuns: 2, optimizationAttempts: 1, penalty: 5, finalScore: 95, isOptimal: true }; }
          return route.fulfill({ json: { accepted: true, verified: true, level, score: 95, execution: { trace: simulate(configs[1].maps![0], input.commands) } } });
        }
        if (endpoint !== "arena-get-state") {
          expect(role).toBe("mc"); writes.push(input.action);
          if (input.action === "robot_demo") {
            const update = input.demo;
            if (update.version !== demo.version) return route.fulfill({ status: 409, json: { error: "stale_demo_version" } });
            const current = demoNow(); demo = { ...current, version: demo.version + 1 };
            if (update.op === "queue") demo = { ...demo, commands: update.commands, trace: simulate(DEMO_MAP, update.commands), status: "editing", currentStepIndex: 0 };
            else if (update.op === "run") demo = { ...demo, status: "running", startedAt: new Date().toISOString() };
            else if (update.op === "pause") demo.status = "paused";
            else if (update.op === "step") { demo.status = "paused"; demo.currentStepIndex = Math.min(demo.trace.length - 1, demo.currentStepIndex + 1); }
            else if (update.op === "reset") { demo.status = "idle"; demo.currentStepIndex = 0; }
            else if (update.op === "explain") { demo.explanation = true; demo.solution = ["forward", "left", "forward", "right", "forward"]; }
          } else if (input.action === "start_stage") { active = true; demoStage = null; }
          else if (input.action === "advance_challenge") { index++; closed = false; }
          else if (input.action === "close_challenge") closed = true;
          else if (input.action === "finalize_stage") { finalized = true; active = false; }
          else if (input.action === "ceremony") { expect(input.expectedPhase).toBe(phase); phase = input.phase; }
          else throw new Error(`Unexpected ${endpoint}: ${input.action}`);
          return route.fulfill({ json: { ok: true } });
        }
        const published = ["ranking", "winner", "explanation", "closing"].includes(phase);
        const revealed = ["winner", "explanation", "closing"].includes(phase);
        const state = {
          mode: "competition", role, serverNow: new Date().toISOString(), rulesVersion: "v5", demoStage,
          robotDemo: demoStage === 2 ? demoNow() : undefined, robotLevels: role === "team" ? [level] : undefined,
          ceremonyPhase: phase, resultsState: published ? "RESULTS_PUBLISHED" : finalized ? "RESULTS_READY" : "STAGE_1_FINALIZED",
          joinCode: "ABC234", teamsCount: 2,
          competition: { id, name: "V5 Workshop", status: published ? "FINALIZED" : finalized ? "STAGE_2_FINALIZED" : active ? "STAGE_2_ACTIVE" : "STAGE_1_FINALIZED", expiresAt: "2099-01-01", ...(role === "mc" || revealed ? { winnerTeamId: published ? "ct-alpha" : null } : {}) },
          stages: [1, 2].map(stageNo => ({ stageNo, status: stageNo === 1 || finalized ? "finalized" : active ? "active" : "pending", roundId: "synthetic-round", activeIndex: stageNo === 1 ? 5 : index,
            totalItems: stageNo === 1 ? 6 : 4, roomCode: "ABC234", startedAt: null, deadlineAt: "2099-01-01", itemDeadline: "2099-01-01", itemFinalizedAt: stageNo === 1 || closed ? "2026-11-01T00:00:00Z" : null,
            progress: { total: 2, submitted: 2 }, challenge: stageNo === 2 && active ? configs[1].maps![index] : null,
            ...(role !== "presentation" ? { config: configs[stageNo - 1] } : {}), teamStatus: role === "mc" ? [{ name: "Synthetic Alpha", submitted: true }, { name: "Synthetic Beta", submitted: true }] : undefined,
          })),
          teams: role === "mc" ? [{ id: "ct-alpha", name: "Synthetic Alpha" }, { id: "ct-beta", name: "Synthetic Beta" }] : undefined,
          own: role === "team" ? { teamId: "team-alpha", competitionTeamId: "ct-alpha", name: "Synthetic Alpha", submissions: [], tieSubmitted: false } : undefined,
          leaderboard: role === "mc" || published ? board() : undefined,
          scoreExplanations: role === "mc" ? explanations() : role === "team" ? explanations().slice(0, 1) : phase === "explanation" ? explanations().slice(0, 1) : undefined,
          tie: role === "mc" ? { active: false, candidates: ["ct-alpha"], attempt: 0, deadlineAt: null } : undefined,
        };
        snapshots.push({ role, state });
        return route.fulfill({ json: state });
      });
    }
    const [mc, present, team] = await Promise.all(contexts.map(c => c.newPage()));
    const shot = async (page: typeof mc, name: string, target?: ReturnType<typeof page.locator>) => {
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (target) await target.screenshot({ path: `${dir}/${info.project.name}-${name}.png` });
      else await page.screenshot({ path: `${dir}/${info.project.name}-${name}.png`, fullPage: true });
    };
    await Promise.all([mc.goto(`/competition/${id}`), present.goto(`/present/${id}#token=synthetic-presentation`), team.goto("/join/ABC234")]);
    const live = (page: typeof mc) => page.getByRole("article", { name: "Robot Demo trực tiếp" });
    const commandSyncStart = Date.now();
    for (const [i, label] of ["↑ Đi thẳng", "↶ Rẽ trái", "↑ Đi thẳng"].entries()) {
      await live(mc).getByRole("button", { name: label, exact: true }).click();
      await expect(live(mc).locator("li")).toHaveCount(i + 1);
    }
    await expect(live(present).locator("li")).toHaveCount(3, { timeout: 12000 });
    const commandSyncMs = Date.now() - commandSyncStart;
    expect(commandSyncMs).toBeLessThan(4000);
    await info.attach("synthetic-demo-sync-metrics", { body: JSON.stringify({ commandSyncMs, contexts: 3, transport: "mocked Edge, real independent browser storages" }), contentType: "application/json" });
    await expect(live(present).getByRole("button")).toHaveCount(0);
    await shot(mc, "01-mc-demo-queue", live(mc)); await shot(present, "02-presentation-demo-queue");
    await live(mc).getByRole("button", { name: "Chạy / Tiếp tục demo" }).click();
    await expect(live(mc).getByRole("button", { name: "Tạm dừng demo" })).toBeEnabled();
    await live(mc).getByRole("button", { name: "Tạm dừng demo" }).click();
    while (demo.currentStepIndex < 2) { await live(mc).getByRole("button", { name: "Từng bước demo" }).click(); await expect(live(mc).getByTestId("demo-step")).toContainText(`Bước ${demo.currentStepIndex}/`); }
    await expect(live(present).getByTestId("demo-step")).toContainText("Bước 2/3", { timeout: 12000 });
    // Capture a running trace, in addition to checking the stable paused step above.
    await live(mc).getByRole("button", { name: "Đặt lại demo" }).click();
    await expect(live(present).getByTestId("demo-step")).toContainText("Bước 0/3");
    await live(mc).getByRole("button", { name: "Chạy / Tiếp tục demo" }).click();
    await expect(live(present).getByTestId("demo-step")).toContainText("Bước 2/3 · running", { timeout: 12000 });
    await shot(present, "03-demo-step-2");
    await live(mc).getByRole("button", { name: "Đặt lại demo" }).click();
    await present.reload(); await expect(live(present).getByTestId("demo-step")).toContainText("Bước 0/3");
    expect(seenKeys.size).toBe(0);
    await mc.getByRole("button", { name: "Bắt đầu phiên 2", exact: true }).click();
    await expect(team.getByRole("button", { name: "Tối ưu lại", exact: true })).toBeVisible({ timeout: 12000 });
    await team.getByRole("button", { name: "Tối ưu lại", exact: true }).click();
    for (let i = 0; i < 4; i++) await team.getByRole("button", { name: "Đi thẳng", exact: true }).click();
    await expect(team.getByRole("button", { name: /Từng bước|Tạm dừng|Chạy thử|Đặt lại|Ghost Path/ })).toHaveCount(0);
    expect(seenKeys.size).toBe(0); // edits never execute or preview
    await team.getByRole("button", { name: "RUN PROGRAM — Tối ưu (−5 điểm)", exact: true }).click();
    await expect(team.getByRole("region", { name: "Điểm Robot chính thức" })).toContainText("95/100");
    await shot(team, "04-optimization-penalty", team.getByRole("region", { name: "Điểm Robot chính thức" }));
    expect(seenKeys.size).toBe(1);
    for (let i = 0; i < 4; i++) {
      await mc.getByRole("button", { name: "Đóng thử thách", exact: true }).click();
      if (i < 3) await mc.getByRole("button", { name: "Thử thách tiếp theo", exact: true }).click();
    }
    mc.once("dialog", dialog => dialog.accept());
    await mc.getByRole("button", { name: "Chốt phiên 2", exact: true }).click();
    await expect(mc.getByRole("heading", { name: "ĐIỀU KHIỂN TRAO GIẢI" })).toBeVisible();
    await shot(mc, "05-private-results", mc.locator(".competition-results"));
    await expect(present.getByRole("heading", { name: "Hẹn gặp tại lễ trao giải" })).toBeVisible({ timeout: 12000 });
    await expect(present.getByText("Synthetic Alpha", { exact: true })).toHaveCount(0);
    const publicBefore = snapshots.filter(s => s.role === "presentation").at(-1)!.state;
    expect(JSON.parse(JSON.stringify(publicBefore))).not.toHaveProperty("leaderboard"); // undefined fields are stripped by the transport
    await mc.getByRole("button", { name: "Chuẩn bị công bố", exact: true }).click();
    // Polling after demo has reverted to 5s; wait for the server-owned phase.
    await expect(present.getByRole("heading", { name: "Sẵn sàng cho khoảnh khắc này?" })).toBeVisible({ timeout: 12000 });
    await shot(present, "06-ceremony-before-reveal");
    await mc.getByRole("button", { name: "Hiển thị bảng xếp hạng", exact: true }).click();
    await expect(present.getByRole("heading", { name: "Bảng vàng SAYNTAX" })).toBeVisible({ timeout: 12000 });
    await expect(present.locator(".champion-announcement")).toHaveCount(0);
    await mc.getByRole("button", { name: "Công bố đội vô địch", exact: true }).click();
    await expect(present.locator(".champion-announcement")).toContainText("Synthetic Alpha", { timeout: 12000 });
    await shot(present, "07-winner-reveal");
    await mc.getByRole("button", { name: "Giải thích điểm số", exact: true }).click();
    const breakdown = present.locator(".score-breakdown");
    await expect(breakdown).toBeVisible({ timeout: 12000 }); await breakdown.locator("summary").click();
    await expect(breakdown.locator("h3").first()).toHaveCSS("color", "rgb(183, 245, 208)");
    await shot(present, "08-winner-explanation");
    expect(writes.filter(a => a === "ceremony")).toHaveLength(4);
  } finally { await Promise.all(contexts.map(c => c.close())); }
});
