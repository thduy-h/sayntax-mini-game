import { expect, test } from "@playwright/test";
import { competitionConfig } from "../../supabase/functions/_shared/competition-content";

const id = "90000000-0000-0000-0000-000000000001";
const before = "1. Trước khi sửa (BEFORE)", after = "2. Sau khi sửa (AFTER)";

test("MC BEFORE/AFTER reaches independent team and spectator contexts through polling, survives reload, resets on next item", async ({ browser }, info) => {
  let mode = "before", demo = true, index = 0, closed = false;
  const questions = competitionConfig(1).questions!.slice(0, 4);
  const writes: string[] = [];
  const options = { viewport: info.project.use.viewport, isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch };
  const contexts = await Promise.all([browser.newContext(options), browser.newContext(options), browser.newContext(options)]);
  try {
    for (const [n, context] of contexts.entries()) {
      const role = ["mc", "team", "presentation"][n];
      await context.addInitScript(({ id, role }) => {
        // A stale same-device value must NEVER override authenticated server state.
        localStorage.setItem("sayntax_a11y_view_mode", "after");
        if (role !== "presentation") sessionStorage.setItem(
          `arena-competition-v2:${id}:${role}:${role === "team" ? 1 : "mc"}`,
          JSON.stringify({ competitionId: id, role, token: `test-${role}`, stage: role === "team" ? 1 : undefined, teamId: role === "team" ? "team-a" : undefined }),
        );
      }, { id, role });
      await context.route("**/functions/v1/**", async route => {
        const body = route.request().postDataJSON();
        const endpoint = route.request().url().split("/").pop();
        if (endpoint === "arena-join-room") return route.fulfill({ json: { mode: "competition", competitionId: id, stage: 1, name: "Display sync", status: "NOT_STARTED" } });
        if (endpoint !== "arena-get-state") {
          expect(role).toBe("mc");
          writes.push(body.action);
          if (body.action === "set_a11y_view") {
            expect(body.viewScope).toBe(demo ? "demo:1" : `stage:1:${index}:test-round`);
            mode = body.viewMode;
          } else if (body.action === "start_stage") { demo = false; mode = "before"; }
          else if (body.action === "close_challenge") closed = true;
          else if (body.action === "advance_challenge") { index++; closed = false; mode = "before"; }
          else throw new Error(`Unexpected action ${body.action}`);
          return route.fulfill({ json: { ok: true } });
        }
        return route.fulfill({ json: {
          mode: "competition", role, serverNow: new Date().toISOString(), demoStage: demo ? 1 : null,
          a11yViewMode: mode, a11yViewScope: demo ? "demo:1" : `stage:1:${index}:test-round`,
          joinCode: "ABC234", competition: { id, name: "Display sync", status: demo ? "NOT_STARTED" : "STAGE_1_ACTIVE", expiresAt: "2099-01-01", winnerTeamId: null },
          stages: [{ stageNo: 1, status: demo ? "pending" : "active", roundId: "test-round", activeIndex: index,
            roomCode: "ABC234", totalItems: 4, startedAt: null, deadlineAt: "2099-01-01", itemDeadline: "2099-01-01", itemFinalizedAt: closed ? "2026-11-01T00:00:00Z" : null,
            progress: { total: 1, submitted: 1 }, challenge: demo ? null : questions[index],
            ...(role === "mc" ? { config: { questions, scenarioIds: questions.map(q => q.id) }, teamStatus: [{ name: "Synthetic team", submitted: true }] } : {}),
          }], teams: role === "mc" ? [{ id: "ct-a", name: "Synthetic team" }] : undefined,
          own: role === "team" ? { teamId: "team-a", competitionTeamId: "ct-a", name: "Synthetic team", submissions: [], tieSubmitted: false } : undefined,
          leaderboard: [],
        } });
      });
    }
    const [mc, team, present] = await Promise.all(contexts.map(c => c.newPage()));
    await Promise.all([mc.goto(`/competition/${id}`), team.goto("/join/ABC234"), present.goto(`/present/${id}#token=test-spectator`)]);
    for (const page of [mc, team, present]) await expect(page.getByRole("button", { name: before, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(team.getByRole("button", { name: after, exact: true })).toBeDisabled();
    await expect(present.getByRole("button", { name: after, exact: true })).toBeDisabled();
    await mc.getByRole("button", { name: after, exact: true }).click();
    for (const page of [mc, team, present]) await expect(page.getByRole("button", { name: after, exact: true })).toHaveAttribute("aria-pressed", "true", { timeout: 12000 });
    await team.reload();
    await expect(team.getByRole("button", { name: after, exact: true })).toHaveAttribute("aria-pressed", "true");
    await mc.getByRole("button", { name: before, exact: true }).click();
    for (const page of [team, present]) await expect(page.getByRole("button", { name: before, exact: true })).toHaveAttribute("aria-pressed", "true", { timeout: 12000 });
    await mc.getByRole("button", { name: "Bắt đầu phiên 1", exact: true }).click();
    await mc.getByRole("button", { name: "Đóng thử thách", exact: true }).click();
    await mc.getByRole("button", { name: after, exact: true }).click();
    for (const page of [team, present]) await expect(page.getByRole("button", { name: after, exact: true })).toHaveAttribute("aria-pressed", "true", { timeout: 12000 });
    await mc.getByRole("button", { name: "Thử thách tiếp theo", exact: true }).click();
    for (const page of [team, present]) {
      await expect(page.getByText(questions[1].title, { exact: true })).toBeVisible({ timeout: 12000 });
      await expect(page.locator(".a11y-compare-toolbar")).toHaveCount(0);
    }
    expect(writes.filter(w => w === "set_a11y_view")).toHaveLength(3);
  } finally { await Promise.all(contexts.map(c => c.close())); }
});
