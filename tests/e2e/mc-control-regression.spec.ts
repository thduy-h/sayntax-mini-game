import { expect, test } from "@playwright/test";
import { DEMO_QUESTION } from "../../src/features/competition/Demo";
import { competitionConfig } from "../../supabase/functions/_shared/competition-content";

const id = "90000000-0000-0000-0000-000000000001";
const questions = competitionConfig(1).questions!;

test("MC can play unscored demo, sees two teams, and advances using backend item count", async ({ page }) => {
  let active = false, index = 0;
  const controls: string[] = [];
  await page.addInitScript(({ id }) => {
    sessionStorage.setItem(`arena-competition-v2:${id}:mc:mc`, JSON.stringify({
      competitionId: id, role: "mc", token: "synthetic-mc-only-credential",
    }));
  }, { id });
  await page.route("**/functions/v1/**", async route => {
    const input = route.request().postDataJSON();
    const endpoint = route.request().url().split("/").pop();
    if (endpoint !== "arena-get-state") {
      expect(["arena-start-round", "arena-manage-room"]).toContain(endpoint);
      controls.push(input.action);
      if (input.action === "start_stage") active = true;
      else if (input.action === "advance_challenge") {
        expect(input.index).toBe(index);
        index++;
      } else throw new Error(`Unexpected write: ${endpoint}`);
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: {
      mode: "competition", role: "mc", serverNow: new Date().toISOString(),
      demoStage: active ? null : 1,
      competition: { id, name: "MC regression", status: active ? "STAGE_1_ACTIVE" : "NOT_STARTED", expiresAt: "2099-01-01", winnerTeamId: null },
      teams: [{ id: "synthetic-a", name: "Alpha" }, { id: "synthetic-b", name: "Beta" }],
      stages: [{ stageNo: 1, status: active ? "active" : "pending", roundId: null,
        roomCode: "ABC234", activeIndex: index, totalItems: 4,
        startedAt: null, deadlineAt: "2099-01-01", itemDeadline: "2099-01-01",
        itemFinalizedAt: null, progress: { total: 2, submitted: 2 },
        teamStatus: [{ name: "Alpha", submitted: true }, { name: "Beta", submitted: true }],
        config: { scenarioIds: questions.slice(0,4).map(q => q.id), questions: questions.slice(0,4) },
      }], leaderboard: [],
    } });
  });
  await page.goto(`/competition/${id}`);
  const demo = page.getByRole("region", { name: "Accessibility Demo" });
  await demo.getByRole("button", { name: `B. ${DEMO_QUESTION.options[1].label}`, exact: true }).click();
  await expect(demo.getByText(/Đã chọn đáp án demo/)).toBeVisible();
  await expect(demo.getByRole("button", { name: "Làm lại demo" })).toBeVisible();
  expect(controls).toEqual([]);
  await page.getByRole("button", { name: "Bắt đầu phiên 1", exact: true }).click();
  await expect(page.getByText("Đã nộp 2/2 đội · Đang chờ 0 đội", { exact: true })).toBeVisible();
  await expect(page.getByText("Alpha · Đã nộp", { exact: true })).toBeVisible();
  const advance = page.getByRole("button", { name: "Thử thách tiếp theo", exact: true });
  for (let n = 1; n < 4; n++) {
    await advance.click();
    await expect(page.getByRole("heading", { name: `Thử thách ${n + 1}/4`, exact: true })).toBeVisible();
  }
  await expect(advance).toBeDisabled();
  expect(controls).toEqual(["start_stage", "advance_challenge", "advance_challenge", "advance_challenge"]);
});

for (const progress of [undefined, { total: 0, submitted: 0 }]) {
test(`missing or inconsistent backend progress (${JSON.stringify(progress)}) is not a fictitious 0/0`, async ({ page }) => {
  await page.addInitScript(({ id }) => {
    sessionStorage.setItem(`arena-competition-v2:${id}:mc:mc`, JSON.stringify({ competitionId: id, role: "mc", token: "synthetic-mc-only-credential" }));
  }, { id });
  await page.route("**/functions/v1/**", route => route.fulfill({ json: {
    mode: "competition", role: "mc", serverNow: new Date().toISOString(),
    competition: { id, name: "Old backend", status: "STAGE_1_ACTIVE", expiresAt: "2099-01-01", winnerTeamId: null },
    teams: [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }], leaderboard: [],
    stages: [{ stageNo: 1, status: "active", roundId: null, activeIndex: 0, startedAt: null, deadlineAt: null, progress, config: { questions } }],
  } }));
  await page.goto(`/competition/${id}`);
  await expect(page.getByText(/Đã đăng ký 2 đội · Chưa nhận được tiến độ/)).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Backend chưa cung cấp trạng thái");
  await expect(page.getByText(/Đã nộp 0\/0/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Thử thách tiếp theo", exact: true })).toBeDisabled();
});

}
