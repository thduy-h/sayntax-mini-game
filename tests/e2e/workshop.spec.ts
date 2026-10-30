import { expect, test, type BrowserContext, type Route } from "@playwright/test";

type Team = { id: string; name: string; created_at: string };
const backend = { room: { id: "room-1", code: "ABC234", status: "lobby", expires_at: "2099-01-01T00:00:00Z", version: 0 }, teams: [] as Team[], round: null as null | { id: string; game: "accessibility" | "robot"; status: string; config: Record<string, unknown>; content_version: string }, scores: [] as Array<{ team_id: string; score: number; updated_at: string }>, submissions: new Set<string>() };

async function mockArena(context: BrowserContext) {
  await context.route("**/functions/v1/**", async (route: Route) => {
    const name = route.request().url().split("/").pop()!;
    const input = route.request().postDataJSON() as Record<string, unknown>;
    const ok = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (name === "arena-create-room") return ok({ room: backend.room, mcToken: "mc-token-123456789" });
    if (name === "arena-join-room") { if (input.action === "resolve") return ok({ mode: "workshop" }); if (backend.teams.length >= 8) return ok({ error: "room_team_limit_reached" }, 409); const team = { id: `team-${backend.teams.length + 1}`, name: String(input.name), created_at: new Date().toISOString() }; backend.teams.push(team); return ok({ roomId: backend.room.id, team, teamToken: `team-token-${team.id}-123456` }); }
    if (name === "arena-manage-room") { const action = String(input.action); if (action === "lock") { backend.room.status = "locked"; backend.room.version++; } if (action === "end_round") { backend.room.status = "locked"; backend.room.version++; if (backend.round) backend.round.status = "completed"; } if (action === "end") { backend.room.status = "completed"; backend.room.version++; } return ok({ ok: true, status: backend.room.status }); }
    if (name === "arena-start-round") { backend.room.status = "running"; backend.room.version++; backend.scores = []; backend.round = { id: `round-${input.game}`, game: input.game as "accessibility" | "robot", status: "running", config: input.config as Record<string, unknown>, content_version: "2026-10-29" }; return ok({ round: backend.round }); }
    if (name === "arena-get-state") return ok({ room: backend.room, round: backend.round, teams: backend.teams, scores: backend.scores });
    if (name === "arena-submit-accessibility") { const key = String(input.idempotencyKey); if (!backend.submissions.has(key)) { backend.submissions.add(key); backend.scores.push({ team_id: String(input.teamId), score: 100, updated_at: new Date().toISOString() }); } return ok({ score: 100, duplicate: backend.submissions.has(`${key}:duplicate`) }); }
    if (name === "arena-submit-robot") { backend.scores = [{ team_id: String(input.teamId), score: 320, updated_at: new Date().toISOString() }]; return ok({ score: 320 }); }
    return ok({ error: "not_mocked" }, 404);
  });
}

test("MC and eight teams get separate summaries for two games in the same mocked room", async ({ browser }, testInfo) => {
  const newContext = () => browser.newContext({ viewport: testInfo.project.use.viewport, isMobile: testInfo.project.use.isMobile, hasTouch: testInfo.project.use.hasTouch });
  backend.teams.length = 0; backend.scores.length = 0; backend.submissions.clear(); backend.room.status = "lobby"; backend.room.version = 0; backend.round = null;
  const mc = await newContext(); await mockArena(mc); const mcPage = await mc.newPage(); await mcPage.goto("/"); await mcPage.getByRole("button", { name: /Mở Workshop cả lớp/i }).click(); await mcPage.getByRole("button", { name: "Tạo phòng workshop", exact: true }).click(); await expect(mcPage.getByText("ABC234", { exact: true })).toBeVisible();
  const teamContexts: BrowserContext[] = [];
  for (let index = 1; index <= 8; index++) { const context = await newContext(); teamContexts.push(context); await mockArena(context); const page = await context.newPage(); await page.goto("/join/ABC234"); await page.getByLabel("Tên đội của bạn:").fill(`Đội ${index}`); await page.getByRole("button", { name: /Vào phòng thi đấu/i }).click(); await expect(page.getByText("Đã vào phòng thành công!")).toBeVisible(); }
  const ninth = await newContext(); await mockArena(ninth); const ninthPage = await ninth.newPage(); await ninthPage.goto("/join/ABC234"); await ninthPage.getByLabel("Tên đội của bạn:").fill("Đội 9"); await ninthPage.getByRole("button", { name: /Vào phòng thi đấu/i }).click(); await expect(ninthPage.getByText("Phòng đã đủ 8 đội.")).toBeVisible();
  await mcPage.getByRole("button", { name: /Khóa phòng và cấu hình/i }).click(); await expect(mcPage.getByText("Đã khóa", { exact: true })).toBeVisible(); await mcPage.getByRole("button", { name: /Chơi Accessibility Unlock/i }).click(); await expect(mcPage.getByRole("heading", { name: "Điểm Accessibility Unlock", exact: true })).toBeVisible();
  await expect(mcPage.getByRole("button", { name: "Mở lại phòng chờ", exact: true })).toBeDisabled();
  await expect(mcPage.getByRole("button", { name: /Chơi Robot Commands/ })).toBeDisabled();
  const teamPage = teamContexts[0].pages()[0]; await teamPage.waitForTimeout(5_500); await teamPage.getByRole("button", { name: /Vào Accessibility Unlock/i }).click(); await teamPage.locator(".option-card").first().click(); await expect(teamPage.getByText("Điểm đã được máy chủ xác minh.")).toBeVisible(); expect(backend.scores[0]?.score).toBe(100);
  // End while the team is still playing: polling must return it to its own summary.
  await mcPage.getByRole("button", { name: "Kết thúc game và tổng kết", exact: true }).click();
  const mcSummary = mcPage.getByRole("region", { name: "Tổng kết Accessibility Unlock", exact: true });
  await expect(mcSummary.getByRole("row", { name: /Đội 1 100 XP/ })).toBeVisible();
  await mcSummary.screenshot({ path: `/tmp/sayntax-game-summary-${testInfo.project.name}.png` });
  await expect(teamPage.getByRole("region", { name: "Tổng kết Accessibility Unlock", exact: true })).toBeVisible({ timeout: 12_000 });
  await teamPage.reload();
  await expect(teamPage.getByRole("region", { name: "Tổng kết Accessibility Unlock", exact: true })).toBeVisible();
  await expect(teamPage.getByRole("button", { name: /Vào Accessibility Unlock/ })).toHaveCount(0);
  // Same room and eight teams, fresh score rows for Robot.
  await mcPage.getByRole("button", { name: /Chơi Robot Commands/ }).click();
  expect(backend.teams).toHaveLength(8);
  expect(backend.room.code).toBe("ABC234");
  await expect(mcPage.getByRole("heading", { name: "Điểm Robot Commands", exact: true })).toBeVisible();
  await expect(mcPage.locator(".leader-score-value").first()).toHaveText("0 XP");
  await teamPage.getByRole("button", { name: "Vào Robot Commands", exact: true }).click({ timeout: 12_000 });
  for (let index = 0; index < 4; index++) await teamPage.locator(".command-palette .btn-forward").click();
  await teamPage.getByRole("button", { name: "Chạy chương trình", exact: true }).click();
  await expect(teamPage.getByText("Điểm đã được máy chủ xác minh.")).toBeVisible();
  await mcPage.getByRole("button", { name: "Kết thúc game và tổng kết", exact: true }).click();
  const robotSummary = mcPage.getByRole("region", { name: "Tổng kết Robot Commands", exact: true });
  await expect(robotSummary.getByRole("row", { name: /Đội 1 320 XP/ })).toBeVisible();
  await expect(robotSummary).not.toContainText("420 XP");
  await expect(teamPage.getByRole("region", { name: "Tổng kết Robot Commands", exact: true })).toBeVisible({ timeout: 12_000 });
  await mcPage.reload();
  await expect(mcPage.getByRole("region", { name: "Tổng kết Robot Commands", exact: true })).toBeVisible();
  await Promise.all([...teamContexts, ninth, mc].map((context) => context.close()));
});
