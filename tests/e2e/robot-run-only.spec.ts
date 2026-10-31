import { expect, test } from "@playwright/test";
import { simulate } from "../../src/features/competition/robotEngine";
import type { Command, MapDefinition } from "../../src/features/competition/types";

// Synthetic Edge transport; canonical transaction/concurrency tests run against local PG separately.
test("official execution has no free exploration and waits for commit; refresh/retry preserves run identity", async ({ page }, info) => {
  const id = "90000000-0000-0000-0000-000000000099";
  const map: MapDefinition = { id: "1", name: "Synthetic official map", width: 6, height: 6, start: { x: 0, y: 0 }, goal: { x: 2, y: 0 }, initialDirection: 1, walls: [], maxCommands: 24 };
  const deadline = new Date(Date.now() + 15 * 60_000).toISOString();
  let runs = 0, successful = false, optimizationAttempts = 0, failOnce = true, hold = false;
  let release: (() => void) | undefined;
  const keys = new Set<string>(), requests: { idempotencyKey: string; commands: Command[]; optimization: boolean }[] = [];
  await page.addInitScript(id => {
    sessionStorage.setItem(`arena-competition-v2:${id}:team:2`, JSON.stringify({ competitionId: id, role: "team", token: "synthetic-team-credential", stage: 2, teamId: "synthetic-team" }));
  }, id);
  const level = () => ({ itemId: "1", canonicalVersion: "run-only-v1", successful, firstCommands: successful ? 2 : null, bestCommands: successful ? 2 : null, bestBaseScore: successful ? 100 : 0, officialRuns: runs, optimizationAttempts, penalty: optimizationAttempts * 5, finalScore: successful ? 100 - optimizationAttempts * 5 : 0 });
  await page.route("**/functions/v1/**", async route => {
    const input = route.request().postDataJSON(), endpoint = route.request().url().split("/").pop();
    if (endpoint === "arena-join-room") return route.fulfill({ json: { mode: "competition", competitionId: id, name: "Execution audit", stage: 2, status: "STAGE_2_ACTIVE" } });
    if (endpoint === "arena-submit-robot") {
      requests.push(input);
      if (failOnce) {
        // Server committed, but its acknowledgement was lost. Never charge this again.
        failOnce = false; keys.add(input.idempotencyKey); runs++;
        successful = Boolean(simulate(map, input.commands).at(-1)?.goal);
        return route.abort("failed");
      }
      if (hold) await new Promise<void>(resolve => { release = resolve; });
      if (!keys.has(input.idempotencyKey)) {
        keys.add(input.idempotencyKey); runs++;
        if (successful) { expect(input.optimization).toBe(true); optimizationAttempts++; }
        successful ||= Boolean(simulate(map, input.commands).at(-1)?.goal);
      }
      return route.fulfill({ json: { accepted: true, verified: successful, level: level(), execution: { trace: simulate(map, input.commands) } } });
    }
    if (endpoint !== "arena-get-state") throw Error(`Unexpected ${endpoint}`);
    return route.fulfill({ json: {
      mode: "competition", role: "team", serverNow: new Date().toISOString(), rulesVersion: "v5", teamsCount: 1, joinCode: "ABC234",
      competition: { id, name: "Execution audit", status: "STAGE_2_ACTIVE", expiresAt: "2099-01-01" },
      stages: [{ stageNo: 1, status: "finalized", activeIndex: 5, totalItems: 6, roundId: "a11y", startedAt: null, deadlineAt: deadline }, { stageNo: 2, status: "active", activeIndex: 0, totalItems: 4, roundId: "robot", startedAt: null, deadlineAt: deadline, itemDeadline: deadline, challenge: map, progress: { total: 1, submitted: runs ? 1 : 0 } }],
      own: { teamId: "synthetic-team", competitionTeamId: "synthetic-identity", name: "Synthetic Team", submissions: [], tieSubmitted: false }, robotLevels: [level()],
    } });
  });
  await page.goto("/join/ABC234");
  const prompt = page.locator(".competition-prompt");
  await expect(prompt.getByRole("button", { name: /Từng bước|Tạm dừng|Tiếp tục|Đặt lại|Chạy thử|Ghost|Xem trước|Lùi bước/ })).toHaveCount(0);
  const robot = prompt.getByRole("img", { name: /^Robot hướng/ });
  const before = await robot.evaluate(el => el.parentElement?.getAttribute("aria-label"));
  await prompt.getByRole("button", { name: "Đi thẳng", exact: true }).click();
  await prompt.getByRole("button", { name: "Đi thẳng", exact: true }).click();
  await expect(prompt.getByRole("status")).toHaveText("Chưa chạy chương trình");
  expect(await robot.evaluate(el => el.parentElement?.getAttribute("aria-label"))).toEqual(before);
  expect(runs).toBe(0); expect(requests).toHaveLength(0);
  await prompt.getByRole("button", { name: "RUN PROGRAM", exact: true }).click();
  await expect(prompt.getByRole("alert")).toContainText("Chưa xác nhận");
  expect(runs).toBe(1); expect(await robot.evaluate(el => el.parentElement?.getAttribute("aria-label"))).toEqual(before);
  const firstKey = requests[0].idempotencyKey;
  // Refresh restores pending commands and the idempotency key, without running or previewing.
  await page.reload();
  await expect(prompt.locator(".competition-command-list span")).toHaveCount(2);
  await expect(prompt.getByRole("status")).toHaveText("Chưa chạy chương trình");
  hold = true;
  await prompt.getByRole("button", { name: "RUN PROGRAM — Nhận lại kết quả", exact: true }).click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await expect(prompt.getByRole("status")).toHaveText("Đang xác nhận lượt chạy…");
  await expect(prompt.getByRole("button", { name: "Đi thẳng", exact: true })).toBeDisabled();
  await expect(prompt.getByRole("button", { name: "Xóa hết", exact: true })).toBeDisabled();
  expect(runs).toBe(1);
  expect(requests[1].idempotencyKey).toBe(firstKey);
  release!(); hold = false;
  await expect(prompt.getByRole("status")).toContainText("Đã tới đích");
  expect(runs).toBe(1);
  await expect(prompt.getByRole("button", { name: "Tối ưu lại", exact: true })).toBeEnabled();
  await expect(prompt.getByRole("button", { name: "RUN PROGRAM — Tối ưu (−5 điểm)", exact: true })).toBeDisabled();
  await expect(prompt.getByText(/Đã đạt lời giải tối ưu|Optimal:|MỤC TIÊU PAR/)).toHaveCount(0);
  await prompt.getByRole("button", { name: "Tối ưu lại", exact: true }).click();
  await expect(prompt.getByRole("alert")).toContainText("trừ 5 điểm, kể cả thất bại");
  await prompt.getByRole("button", { name: "RUN PROGRAM — Tối ưu (−5 điểm)", exact: true }).click();
  await expect(prompt.getByRole("status")).toContainText("Đã tới đích");
  await expect(prompt.getByRole("region", { name: "Điểm Robot chính thức" })).toContainText("95/100");
  await page.reload();
  await expect(prompt.getByRole("region", { name: "Điểm Robot chính thức" })).toContainText("2 lượt chạy");
  await expect(prompt.getByRole("region", { name: "Điểm Robot chính thức" })).toContainText("phí tối ưu 5");
  await page.screenshot({ path: `artifacts/ui-review/run-only/${info.project.name}-official-run-only.png`, fullPage: true });
  expect(runs).toBe(2); expect(optimizationAttempts).toBe(1);
});
