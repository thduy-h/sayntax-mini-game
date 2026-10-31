import QRCode from "qrcode";
import {
  competitionConfig,
  competitionAnswer,
  competitionRobotScore,
  shortestCommands,
} from "../../supabase/functions/_shared/competition-content";
import { ROBOT_LEVELS } from "../../supabase/functions/_shared/canonical";
import { mkdir } from "node:fs/promises";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// Mocked Edge transport only. SQL/RLS/concurrency are verified separately in real PostgreSQL.
const CID = "90000000-0000-0000-0000-000000000001";
function fixture() {
  const questions = competitionConfig(1).questions!;
  const maps = competitionConfig(2).maps!;
  const teams: Array<{
    id: string;
    name: string;
    credential: string;
    tokens: Record<number, string>;
    answers: Record<string, string>;
    robot: Record<string, number>;
  }> = [];
  const stages = [
    {
      stageNo: 1,
      status: "pending",
      roundId: null as string | null,
      roomCode: "ABC234",
      activeIndex: 0,
      itemFinalizedAt: null as string | null,
      itemDeadline: null as string | null,
      startedAt: null as string | null,
      deadlineAt: null as string | null,
      config: { scenarioIds: questions.map((q) => q.id), questions },
    },
    {
      stageNo: 2,
      status: "pending",
      roundId: null as string | null,
      roomCode: "DEF567",
      activeIndex: 0,
      itemFinalizedAt: null as string | null,
      itemDeadline: null as string | null,
      startedAt: null as string | null,
      deadlineAt: null as string | null,
      config: { levelIds: maps.map((m) => m.id), maps },
    },
  ];
  let status = "NOT_STARTED",
    presentationToken = "",
    demoStage: number | null = null,
    winnerTeamId: string | null = null;
  const mc = "mc-synthetic-competition-capability";
  const leaderboard = () =>
    teams.map((t, i) => {
      const a =
        stages[0].status === "finalized"
          ? Object.entries(t.answers).reduce(
              (v, [id, o]) => v + competitionAnswer(id, o),
              0,
            )
          : 0;
      const r =
        stages[1].status === "finalized"
          ? Object.values(t.robot).reduce((v, p) => v + p, 0)
          : 0;
      return {
        teamId: t.id,
        name: t.name,
        accessibility: a,
        robot: r,
        accessibility50: a / 8,
        robot50: r / 6,
        final100: a / 8 + r / 6,
        rank: i + 1,
        perfectAccessibility: a / 100,
        optimalRobot: r / 100,
      };
    });
  async function bind(context: BrowserContext) {
    await context.route("**/functions/v1/**", async (route) => {
      const endpoint = route.request().url().split("/").pop()!,
        input = route.request().postDataJSON(),
        h = route.request().headers();
      const send = (data: unknown, statusCode = 200) =>
        route.fulfill({
          status: statusCode,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      const deny = () => send({ error: "forbidden" }, 403);
      if (endpoint === "arena-create-room")
        return send({
          competitionId: CID,
          mcToken: mc,
          stage1Code: "ABC234",
          stage2Code: "DEF567",
        });
      if (endpoint === "arena-join-room") {
        if (input.action === "resolve")
          return send({ mode: "competition", competitionId: CID });
        const stage = [
          "STAGE_1_FINALIZED",
          "STAGE_2_ACTIVE",
          "STAGE_2_FINALIZED",
          "FINALIZED",
        ].includes(status)
          ? 2
          : 1;
        if (input.action === "inspect")
          return send({
            competitionId: CID,
            name: "SAYNTAX Mock Competition",
            stage,
            status,
          });
        let team = teams.find((t) => t.credential === input.recoveryCredential);
        if (!team) {
          if (!input.register || stage === 2) return deny();
          if (teams.length >= 8)
            return send({ error: "room_team_limit_reached" }, 409);
          team = {
            id: `ct-${teams.length + 1}`,
            name: input.name,
            credential: input.recoveryCredential,
            tokens: {},
            answers: {},
            robot: {},
          };
          teams.push(team);
        }
        const token = `team-synthetic-${team.id}-stage-${stage}`;
        team.tokens[1] = token;
        team.tokens[2] = token;
        return send({
          mode: "competition",
          competitionId: CID,
          competitionTeamId: team.id,
          roomId: `room-${stage}`,
          team: { id: `${team.id}-room-${stage}`, name: team.name },
          teamToken: token,
        });
      }
      if (
        endpoint === "arena-manage-room" ||
        endpoint === "arena-start-round"
      ) {
        if (h["x-mc-token"] !== mc) return deny();
        const stage = stages[input.stage - 1];
        if (input.action === "presentation_rotate") {
          presentationToken = `spectator-synthetic-${Date.now()}`;
          return send({ ok: true, presentationToken });
        }
        if (input.action === "presentation_revoke") {
          presentationToken = "";
          return send({ ok: true });
        }
        if (input.action === "show_demo") {
          demoStage = input.stage;
          return send({ ok: true });
        }
        if (["close_challenge", "advance_challenge"].includes(input.action)) {
          if (stage.status !== "active" || stage.activeIndex !== input.index)
            return send({ error: "invalid_transition" }, 409);
          const item =
            stage.stageNo === 1
              ? questions[stage.activeIndex].id
              : maps[stage.activeIndex].id;
          const submitted = teams.filter((t) =>
            stage.stageNo === 1 ? item in t.answers : item in t.robot,
          ).length;
          if (
            submitted < teams.length &&
            Date.parse(stage.itemDeadline!) > Date.now()
          )
            return send({ error: "teams_pending" }, 409);
          if (input.action === "close_challenge")
            stage.itemFinalizedAt = new Date().toISOString();
          else {
            stage.activeIndex++;
            stage.itemFinalizedAt = null;
            stage.itemDeadline = new Date(Date.now() + 150000).toISOString();
          }
          return send({ ok: true });
        }
        if (input.action === "start_stage") {
          demoStage = null;
          stage.itemDeadline = new Date(Date.now() + 150000).toISOString();
          stage.status = "active";
          stage.roundId = `round-${input.stage}`;
          stage.startedAt = new Date().toISOString();
          stage.deadlineAt = new Date(
            Date.now() + (input.stage === 1 ? 600 : 900) * 1000,
          ).toISOString();
          status = `STAGE_${input.stage}_ACTIVE`;
          return send({ ok: true });
        }
        if (input.action === "finalize_stage") {
          if (
            !stage.itemFinalizedAt ||
            stage.activeIndex !== (stage.stageNo === 1 ? 3 : 2)
          )
            return send({ error: "challenges_pending" }, 409);
          stage.status = "finalized";
          status = `STAGE_${input.stage}_FINALIZED`;
          return send({ ok: true });
        }
        if (input.action === "publish") {
          status = "FINALIZED";
          winnerTeamId = teams[0].id;
          return send({ ok: true });
        }
        if (input.action === "configure") return send({ ok: true });
        throw new Error(`Unexpected competition control: ${input.action}`);
      }
      const team = teams.find((t) =>
        Object.values(t.tokens).includes(h["x-team-token"]),
      );
      if (endpoint === "arena-get-state") {
        const role = input.presentationToken
          ? "presentation"
          : h["x-mc-token"] === mc
            ? "mc"
            : team
              ? "team"
              : null;
        if (
          !role ||
          (role === "presentation" &&
            input.presentationToken !== presentationToken)
        )
          return deny();
        const projection = stages.map((s) => {
          const current = (s.stageNo === 1 ? questions : maps)[s.activeIndex];
          const progress = {
            total: teams.length,
            submitted: teams.filter((t) =>
              s.stageNo === 1 ? current.id in t.answers : current.id in t.robot,
            ).length,
          };
          const { config, ...publicStage } = s;
          return {
            ...publicStage,
            totalItems: s.stageNo === 1 ? 4 : 3,
            activeItemId: current.id,
            progress,
            challenge: s.status === "active" ? current : null,
            ...(role === "mc"
              ? {
                  teamStatus: teams.map((t) => ({
                    name: t.name,
                    submitted:
                      s.stageNo === 1
                        ? current.id in t.answers
                        : current.id in t.robot,
                  })),
                }
              : {}),
            ...(role === "mc" ||
            (s.status === "finalized" && role !== "presentation")
              ? { config }
              : {}),
          };
        });
        return send({
          mode: "competition",
          role,
          serverNow: new Date().toISOString(),
          demoStage,
          ...(role !== "presentation" ? { joinCode: "ABC234" } : {}),
          competition: {
            id: CID,
            name: "SAYNTAX Mock Competition",
            status,
            expiresAt: "2099-01-01",
            winnerTeamId,
          },
          stages: projection,
          ...(role !== "presentation"
            ? {
                leaderboard: leaderboard(),
                tie: {
                  active: false,
                  attempt: 0,
                  candidates:
                    status === "STAGE_2_FINALIZED" ? [teams[0]?.id] : [],
                },
              }
            : {}),
          ...(role === "mc"
            ? {
                teams: teams.map((t) => ({ id: t.id, name: t.name })),
                recoveryRequests: [],
                presentationEnabled: Boolean(presentationToken),
              }
            : {}),
          ...(role === "team"
            ? {
                own: {
                  teamId: `${team!.id}-room-${["NOT_STARTED", "STAGE_1_ACTIVE"].includes(status) ? 1 : 2}`,
                  competitionTeamId: team!.id,
                  name: team!.name,
                  tieSubmitted: false,
                  submissions: ["NOT_STARTED", "STAGE_1_ACTIVE"].includes(
                    status,
                  )
                    ? Object.entries(team!.answers).map(
                        ([itemId, answerId]) => ({
                          itemId,
                          answerId,
                          score:
                            stages[0].status === "finalized"
                              ? competitionAnswer(itemId, answerId)
                              : null,
                        }),
                      )
                    : Object.entries(team!.robot).map(([itemId, score]) => ({
                        itemId,
                        score,
                      })),
                },
              }
            : {}),
        });
      }
      if (
        endpoint === "arena-submit-accessibility" ||
        endpoint === "arena-submit-robot"
      ) {
        if (!team) return deny();
        const active =
          stages[endpoint === "arena-submit-accessibility" ? 0 : 1];
        if (
          active.itemFinalizedAt ||
          Date.parse(active.itemDeadline!) <= Date.now() ||
          input.itemId !==
            (active.stageNo === 1 ? questions : maps)[active.activeIndex].id
        )
          return send({ error: "inactive_challenge" }, 409);
        expect(input.xp).toBeUndefined();
        expect(input.par).toBeUndefined();
        if (endpoint === "arena-submit-accessibility") {
          if (stages[0].status !== "active")
            return send({ error: "stage_closed" }, 409);
          team.answers[input.itemId] ??= input.answerId;
          return send({ accepted: true });
        }
        if (stages[1].status !== "active")
          return send({ error: "stage_closed" }, 409);
        const verified = competitionRobotScore(input.itemId, input.commands);
        team.robot[input.itemId] = Math.max(
          team.robot[input.itemId] ?? 0,
          verified.score,
        );
        return send({ accepted: true, verified: verified.successful, score: verified.score, execution: { trace: verified.trace } });
      }
      throw new Error(`Unexpected competition endpoint: ${endpoint}`);
    });
  }
  return { bind, teams, stages, questions, maps };
}
async function joinTeam(
  page: Page,
  code: string,
  name?: string,
  credential?: string,
) {
  await page.goto(`/join/${code}`);
  if (credential) {
    await page
      .getByLabel("Credential phục hồi đội", { exact: true })
      .fill(credential);
    await page
      .getByRole("button", { name: "Khôi phục đội", exact: true })
      .click();
  } else {
    await page.getByLabel("Tên đội", { exact: true }).fill(name!);
    await page
      .getByRole("button", { name: "Đăng ký đội", exact: true })
      .click();
  }
  await expect(
    page.getByRole("button", { name: "Tải thẻ phục hồi đội", exact: true }),
  ).toBeVisible();
}
test("mocked eight-team two-stage competition survives closed devices and publishes one winner", async ({
  browser,
}, info) => {
  test.setTimeout(120_000);
  const backend = fixture(),
    contexts: BrowserContext[] = [];
  const reviewDir = `artifacts/ui-review/${info.project.name}`;
  await mkdir(reviewDir, { recursive: true });
  const capture = async (target: Page, name: string) => {
    if (name === "09-stage2-identity-restoration")
      await expect(
        target.getByLabel("Credential phục hồi đội", { exact: true }),
      ).toBeVisible();
    else await expect(target.locator(".competition-state")).toBeVisible();
    if (name === "04-accessibility-participant")
      await expect(
        target.getByRole("heading", {
          name: backend.questions[0].title,
          exact: true,
        }),
      ).toBeVisible();
    if (name === "05-robot-demo")
      await expect(
        target.getByRole("heading", {
          name: "Thử trước khi thi · Robot",
          exact: true,
        }),
      ).toBeVisible();
    await expect
      .poll(() =>
        target.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      )
      .toBe(true);
    await target.screenshot({
      path: `${reviewDir}/${name}.png`,
      fullPage: true,
    });
  };
  const context = async () => {
    const c = await browser.newContext({
      viewport: info.project.use.viewport,
      isMobile: info.project.use.isMobile,
      hasTouch: info.project.use.hasTouch,
    });
    await backend.bind(c);
    contexts.push(c);
    return c;
  };
  try {
    const mc = await context(),
      page = await mc.newPage();
    page.on("dialog", (d) => d.accept());
    await page.goto("/competition");
    await page
      .getByRole("button", { name: "Tạo cuộc thi", exact: true })
      .click();
    await expect(page).toHaveURL(`/competition/${CID}`);
    for (let i = 0; i < 8; i++) {
      const c = await context();
      await joinTeam(await c.newPage(), "ABC234", `Đội ${i + 1}`);
    }
    const ninth = await context(),
      ninthPage = await ninth.newPage();
    await ninthPage.goto(`/join/ABC234?competition=${CID}`);
    await ninthPage.getByLabel("Tên đội", { exact: true }).fill("Đội 9");
    await ninthPage
      .getByRole("button", { name: "Đăng ký đội", exact: true })
      .click();
    await expect(ninthPage.getByRole("alert")).toContainText("đủ 8 đội");
    await page
      .getByRole("button", { name: "Tạo link trình chiếu", exact: true })
      .click();
    const link = await page
      .getByRole("link", { name: "Mở Presentation", exact: true })
      .getAttribute("href");
    const spectator = await context(),
      screen = await spectator.newPage();
    await screen.goto(link!);
    await expect(
      screen.getByRole("heading", { name: "Chờ MC mở thử thách", exact: true }),
    ).toBeVisible();
    await screen.reload();
    await page.reload();
    const persistentLink = await page.locator(".competition-url").innerText();
    await capture(page, "01-admin-dashboard");
    const qrPanel = page.locator("section").filter({
      has: page.getByRole("heading", {
        name: "Một QR tham gia xuyên suốt cuộc thi",
        exact: true,
      }),
    });
    await expect(qrPanel.getByRole("img")).toBeVisible();
    const matrix = QRCode.create(persistentLink).modules;
    const pixels = await qrPanel.getByRole("img").evaluate((element, size) => {
      const image = element as HTMLImageElement,
        canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        scale = canvas.width / (size + 8);
      return Array.from({ length: size * size }, (_, i) => {
        const x = Math.floor(((i % size) + 4.5) * scale),
          y = Math.floor((Math.floor(i / size) + 4.5) * scale);
        return rgba[(y * canvas.width + x) * 4] < 128 ? 1 : 0;
      });
    }, matrix.size);
    expect(pixels).toEqual(Array.from(matrix.data));
    await qrPanel.screenshot({
      path: `${reviewDir}/08-persistent-join-qr.png`,
    });
    await page
      .getByRole("button", { name: "Hiển thị Demo phiên 1", exact: true })
      .click();
    const demoPlayer = contexts[1].pages()[0];
    await demoPlayer.reload();
    await expect(
      demoPlayer.getByRole("heading", {
        name: "Thử trước khi thi · Accessibility",
        exact: true,
      }),
    ).toBeVisible();
    await demoPlayer
      .getByRole("button", { name: /Đổi chữ sang màu tối/ })
      .click();
    await expect(demoPlayer.getByText(/Giải pháp: đổi màu chữ/)).toBeVisible();
    expect(
      backend.teams.every((t) => Object.keys(t.answers).length === 0),
    ).toBe(true);
    await capture(demoPlayer, "02-accessibility-demo");
    await screen.reload();
    await expect(screen.locator(".option-card")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Bắt đầu phiên 1", exact: true })
      .click();
    await expect(
      page.getByText("STAGE_1_ACTIVE", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".option-card")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Gửi chương trình", exact: true }),
    ).toHaveCount(0);
    await expect(
      screen.getByRole("heading", {
        name: backend.questions[0].title,
        exact: true,
      }),
    ).toBeVisible({ timeout: 12_000 });
    await expect(screen.locator(".competition-options li")).toHaveCount(3);
    await expect(screen.locator(".option-card")).toHaveCount(0);
    await expect
      .poll(() =>
        screen.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      )
      .toBe(true);
    await screen.screenshot({
      path: info.outputPath("presentation.png"),
      fullPage: true,
    });
    await page.screenshot({
      path: info.outputPath("mc-control.png"),
      fullPage: true,
    });
    await capture(screen, "03-accessibility-presentation");
    const player = contexts[1].pages()[0];
    await player.reload();
    await capture(player, "04-accessibility-participant");
    // Direct forged transport still cannot submit a future challenge or acquire MC control.
    const denied = await player.evaluate(
      async ({ cid, token, teamId }) => {
        const call = async (fn: string, body: Record<string, unknown>) =>
          (
            await fetch(`http://supabase.test/functions/v1/${fn}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-team-token": token,
              },
              body: JSON.stringify(body),
            })
          ).json();
        return [
          await call("arena-manage-room", {
            competitionId: cid,
            action: "advance_challenge",
            stage: 1,
            index: 0,
          }),
          await call("arena-submit-accessibility", {
            roundId: "round-1",
            teamId,
            itemId: "captions",
            answerId: "o1",
            idempotencyKey: "forged",
          }),
        ];
      },
      {
        cid: CID,
        token: backend.teams[0].tokens[1],
        teamId: `${backend.teams[0].id}-room-1`,
      },
    );
    expect(denied.map((x) => x.error)).toEqual([
      "forbidden",
      "inactive_challenge",
    ]);
    await expect(
      player.getByRole("heading", { name: /Phiên 1 · Accessibility/ }),
    ).toBeVisible({ timeout: 12_000 });
    for (let i = 0; i < 4; i++) {
      await expect(
        screen.getByRole("heading", {
          name: backend.questions[i].title,
          exact: true,
        }),
      ).toBeVisible({ timeout: 12000 });
      await expect(
        player.getByRole("heading", {
          name: backend.questions[i].title,
          exact: true,
        }),
      ).toBeVisible({ timeout: 12000 });
      await expect(
        player.getByRole("navigation", { name: "Chọn thử thách" }),
      ).toHaveCount(0);
      const best = backend.questions[i].options.find(
        (o) => competitionAnswer(backend.questions[i].id, o.id) === 100,
      )!;
      const option = player.getByRole("button").filter({ hasText: best.label });
      if (i === 0) {
        await option.focus();
        await option.press("Enter");
      } else await option.click();
      await expect(
        player.getByRole("status").filter({ hasText: "Đã ghi nhận lựa chọn" }),
      ).toBeVisible();
      await expect(player.getByText(/Đúng!|Chính xác!|100 XP/)).toHaveCount(0);
      await Promise.all(
        contexts.slice(2, 9).map(async (c) => {
          const p = c.pages()[0];
          await expect(
            p.getByRole("heading", {
              name: backend.questions[i].title,
              exact: true,
            }),
          ).toBeVisible({ timeout: 12000 });
          await p.getByRole("button").filter({ hasText: best.label }).click();
        }),
      );
      await page.reload();
      await page
        .getByRole("button", {
          name: i === 3 ? "Đóng thử thách" : "Thử thách tiếp theo",
          exact: true,
        })
        .first()
        .click();
    }
    await page
      .getByRole("button", { name: "Chốt phiên 1", exact: true })
      .click();
    await expect(
      page.getByRole("cell", { name: "50.00", exact: true }).first(),
    ).toBeVisible();
    const recovery = backend.teams[0].credential,
      stableId = backend.teams[0].id;
    await player.reload();
    await expect(
      player.getByRole("heading", {
        name: "Chờ MC bắt đầu phiên",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      player.getByText(`ID đội: ${stableId}`, { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Hiển thị Demo phiên 2", exact: true })
      .click();
    await screen.reload();
    await expect(
      screen.getByRole("heading", {
        name: "Thử trước khi thi · Robot",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      screen.getByRole("button", { name: "Đi thẳng", exact: true }),
    ).toHaveCount(0);
    await player.reload();
    await capture(player, "05-robot-demo");
    expect(backend.teams.every((t) => Object.keys(t.robot).length === 0)).toBe(
      true,
    );
    await expect(page.locator(".competition-url")).toHaveText(persistentLink);
    // Close every Stage 1 participant context; Stage 2 uses fresh browser/device storage.
    for (let i = 1; i <= 8; i++) await contexts[i].close();
    await page
      .getByRole("button", { name: "Bắt đầu phiên 2", exact: true })
      .click();
    const fresh = await context(),
      robot = await fresh.newPage();
    await robot.goto(`/join/ABC234`);
    await expect(
      robot.getByLabel("Credential phục hồi đội", { exact: true }),
    ).toBeVisible();
    await capture(robot, "09-stage2-identity-restoration");
    await joinTeam(robot, "ABC234", undefined, recovery);
    expect(backend.teams).toHaveLength(8);
    await screen.reload();
    await capture(screen, "06-robot-presentation");
    await capture(robot, "07-robot-participant");
    await expect(
      robot.getByText(`ID đội: ${stableId}`, { exact: true }),
    ).toBeVisible();
    for (let i = 0; i < 3; i++) {
      await expect(
        screen.getByRole("heading", {
          name: backend.maps[i].name,
          exact: true,
        }),
      ).toBeVisible({ timeout: 12000 });
      await expect(
        robot.getByRole("heading", {
          name: backend.maps[i].name,
          exact: true,
        }),
      ).toBeVisible({ timeout: 12000 });
      const solution = shortestCommands(ROBOT_LEVELS[backend.maps[i].id]);
      for (const cmd of solution)
        await robot
          .getByRole("button", {
            name:
              cmd === "forward"
                ? "Đi thẳng"
                : cmd === "left"
                  ? "Rẽ trái"
                  : "Rẽ phải",
            exact: true,
          })
          .click();
      await expect(robot.getByRole("button", { name: /Từng bước|Chạy thử|Tạm dừng|Ghost Path/ })).toHaveCount(0);
      await robot.getByRole("button", { name: "RUN PROGRAM", exact: true }).click();
      await expect(
        robot.getByRole("status").filter({ hasText: "Đã tới đích" }),
      ).toBeVisible({ timeout: 12000 });

      await expect(
        robot.getByRole("region", { name: "Điểm Robot chính thức" }),
      ).toContainText("100/100");
      await expect(
        robot.getByText(/Chuỗi tối ưu|Ghost Path|MỤC TIÊU PAR/),
      ).toHaveCount(0);
      backend.stages[1].itemDeadline = new Date(
        Date.now() - 1000,
      ).toISOString();
      await page.reload();
      await page
        .getByRole("button", {
          name: i === 2 ? "Đóng thử thách" : "Thử thách tiếp theo",
          exact: true,
        })
        .last()
        .click();
    }
    await page
      .getByRole("button", { name: "Chốt phiên 2", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Công bố đội chiến thắng", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "🏆 ĐỘI CHIẾN THẮNG: Đội 1",
        exact: true,
      }),
    ).toBeVisible();
    await capture(page, "10-final-leaderboard");
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "🏆 ĐỘI CHIẾN THẮNG: Đội 1",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Thu hồi link trình chiếu", exact: true })
      .click();
    await screen.reload();
    await expect(screen.getByRole("alert")).toContainText("không hợp lệ");
  } finally {
    await Promise.all(contexts.map((c) => c.close().catch(() => {})));
  }
});

test("direct presentation route rejects an invalid capability without exposing participant controls", async ({
  page,
}) => {
  const backend = fixture();
  await backend.bind(page.context());
  await page.goto(`/present/${CID}#token=invalid-synthetic-capability`);
  await expect(page.getByRole("alert")).toContainText("không hợp lệ");
  await expect(
    page.getByRole("button", { name: /Gửi|Đăng ký đội|Tạo cuộc thi/ }),
  ).toHaveCount(0);
});

test("legacy create-room success is rejected without navigation or credential persistence", async ({
  page,
}) => {
  let creates = 0;
  await page.route("**/functions/v1/**", async (route) => {
    if (!route.request().url().endsWith("arena-create-room"))
      throw new Error("Unexpected state request after incompatible creation");
    creates++;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        room: { id: CID, code: "ABC234" },
        mcToken: "synthetic-legacy-mc-token",
      }),
    });
  });
  await page.goto("/competition");
  await page.getByRole("button", { name: "Tạo cuộc thi", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Backend đang chạy phiên bản cũ",
  );
  await expect(page).toHaveURL("/competition");
  await expect(
    page.getByRole("button", { name: "Tạo cuộc thi", exact: true }),
  ).toBeEnabled();
  expect(creates).toBe(1);
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((key) =>
        key.startsWith("arena-competition-v2:"),
      ),
    ),
  ).toEqual([]);
});

for (const path of ["/competition/undefined", "/competition/not-a-uuid"]) {
  test(`invalid MC route ${path} explains the deployment mismatch and recovers to creation`, async ({
    page,
  }) => {
    const calls: string[] = [];
    await page.route("**/functions/v1/**", async (route) => {
      calls.push(route.request().url());
      await route.abort();
    });
    await page.goto(path);
    await expect(page.getByRole("alert")).toContainText(
      "Liên kết cuộc thi không hợp lệ",
    );
    await expect(
      page.getByText("Phiên MC không có trên thiết bị này.", { exact: false }),
    ).toHaveCount(0);
    await page.reload();
    await page
      .getByRole("link", { name: "Về trang tạo cuộc thi", exact: true })
      .click();
    await expect(page).toHaveURL("/competition");
    await expect(
      page.getByRole("button", { name: "Tạo cuộc thi", exact: true }),
    ).toBeVisible();
    expect(calls).toEqual([]);
  });
}

test("a competition URL alone never grants MC authority", async ({ page }) => {
  const calls: string[] = [];
  await page.route("**/functions/v1/**", async (route) => {
    calls.push(route.request().url());
    await route.abort();
  });
  await page.goto(`/competition/${CID}`);
  await expect(
    page.getByText("Không tìm thấy phiên quản trị", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bắt đầu phiên 1", exact: true }),
  ).toHaveCount(0);
  expect(calls).toEqual([]);
});
