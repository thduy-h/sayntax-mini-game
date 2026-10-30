import { expect, test, type Page } from "@playwright/test";
import QRCode from "qrcode";

const room = { id: "join-room", code: "ABC234", status: "lobby", version: 0, expires_at: "2099-01-01T00:00:00Z" };
const team = { id: "join-team", name: "Đội Điện Thoại", created_at: "2026-10-30T00:00:00Z" };

async function backend(page: Page, denial?: string) {
  const joined: Array<Record<string, unknown>> = [];
  await page.route("**/functions/v1/**", async (route) => {
    const endpoint = new URL(route.request().url()).pathname.split("/").pop();
    const input = route.request().postDataJSON() as Record<string, unknown>;
    const send = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (endpoint === "arena-create-room") return send({ room, mcToken: "mc-token-synthetic-123456" });
    if (endpoint === "arena-join-room") {
      if (input.action === "resolve") return send({ mode: "workshop" });
      joined.push(input);
      if (denial) return send({ error: denial }, denial === "room_team_limit_reached" ? 409 : 404);
      return send({ roomId: room.id, team, teamToken: "team-token-synthetic-123456" });
    }
    if (endpoint === "arena-get-state") return send({ room, round: null, teams: joined.length ? [team] : [], scores: [] });
    throw new Error(`Unexpected backend endpoint: ${endpoint}`);
  });
  return joined;
}

async function expectJoin(page: Page, code: string) {
  await expect(page.getByRole("heading", { name: "Tham gia workshop", exact: true })).toBeVisible();
  await expect(page.getByLabel("Mã phòng:", { exact: true })).toHaveValue(code);
  await expect(page.getByLabel("Tên đội của bạn:")).toBeVisible();
}

test("homepage and MC generate matching QR, modal and clipboard links on the frontend origin", async ({ page }) => {
  await backend(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text: string) => { (window as unknown as { copiedLink: string }).copiedLink = text; } } });
  });
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await page.getByRole("button", { name: /Mở Workshop cả lớp/i }).click();
  await expect(page.getByRole("heading", { name: "Workshop Arena", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sao chép liên kết", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Tạo phòng workshop", exact: true }).click();
  const url = `${new URL(page.url()).origin}/join/ABC234`;
  await expect(page.locator(".room-url-hint")).toHaveText(url);
  await page.getByRole("button", { name: "Sao chép liên kết", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { copiedLink: string }).copiedLink)).toBe(url);
  const image = page.getByRole("img", { name: "Mã QR phòng ABC234", exact: true });
  await expect(image).toBeVisible();
  // Verify the actual rendered QR bitmap against the matrix for this exact URL.
  const expected = QRCode.create(url).modules;
  const pixels = await image.evaluate((element, size) => {
    const img = element as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(img, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const scale = canvas.width / (size + 2); // margin = 1 module on each side
    return Array.from({ length: size * size }, (_, index) => {
      const x = Math.floor((index % size + 1.5) * scale);
      const y = Math.floor((Math.floor(index / size) + 1.5) * scale);
      return data[(y * canvas.width + x) * 4] < 128 ? 1 : 0;
    });
  }, expected.size);
  expect(pixels).toEqual(Array.from(expected.data));
  await page.getByRole("button", { name: "Chiếu to", exact: true }).click();
  await expect(page.locator(".modal-url-text")).toHaveText(url);
});

test("direct join and refresh render React, submit to arena-join-room, then restore team identity", async ({ page }) => {
  const joined = await backend(page);
  const response = await page.goto("/join/abc234?from=qr");
  expect(response?.status()).toBe(200);
  await expectJoin(page, "ABC234");
  expect(joined).toHaveLength(0); // Joining requires explicit name/consent.
  await page.reload();
  await expectJoin(page, "ABC234");
  await page.getByLabel("Tên đội của bạn:").fill(team.name);
  const request = page.waitForRequest((req) => req.url().endsWith("/arena-join-room") && req.method() === "POST");
  await page.getByRole("button", { name: /Vào phòng thi đấu/i }).click();
  expect((await request).postDataJSON()).toEqual({ code: "ABC234", name: team.name });
  await expect(page.getByText("Đã vào phòng thành công!", { exact: true })).toBeVisible();
  await expect(page.getByText(team.name, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Đã vào phòng thành công!", { exact: true })).toBeVisible();
  await expect(page.getByText(team.name, { exact: true })).toBeVisible();
  expect(joined).toHaveLength(1);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("/join/ABC123 shows code validation in the app and can be corrected without going home", async ({ page }) => {
  const joined = await backend(page);
  await page.goto("/join/ABC123");
  await expectJoin(page, "ABC123");
  await expect(page.getByRole("alert")).toContainText("không dùng 0, 1");
  await page.getByLabel("Tên đội của bạn:").fill(team.name);
  await expect(page.getByRole("button", { name: /Vào phòng thi đấu/i })).toBeDisabled();
  expect(joined).toHaveLength(0);
  await page.getByLabel("Mã phòng:", { exact: true }).fill("ABC234");
  await page.getByLabel("Tên đội của bạn:").press("Enter");
  await expect(page.getByText("Đã vào phòng thành công!", { exact: true })).toBeVisible();
  expect(joined).toEqual([{ code: "ABC234", name: team.name }]);
  await expect(page).toHaveURL(/\/join\/ABC234$/);
  await page.reload();
  await expect(page.getByText("Đã vào phòng thành công!", { exact: true })).toBeVisible();
  expect(joined).toHaveLength(1);
});

for (const path of ["/join/", "/join/ABC234/extra", "/join/ABC23"]) {
  test(`malformed path ${path} stays in the join app with a recoverable form`, async ({ page }) => {
    const joined = await backend(page);
    await page.goto(path);
    await expectJoin(page, path === "/join/ABC23" ? "ABC23" : "");
    await expect(page.getByRole("alert")).toContainText("6 ký tự");
    expect(joined).toHaveLength(0);
  });
}

// Current backend deliberately returns not_found for all three states.
for (const state of ["missing", "expired", "locked"] as const) {
  test(`${state} room shows the backend's grouped application denial`, async ({ page }) => {
    const joined = await backend(page, "not_found");
    await page.goto("/join/ABC234");
    await page.getByLabel("Tên đội của bạn:").fill(team.name);
    await page.getByRole("button", { name: /Vào phòng thi đấu/i }).click();
    await expect(page.getByRole("alert")).toContainText("mã không tồn tại, phòng đã hết hạn hoặc MC đã khóa/đóng phòng");
    await expect(page.getByRole("button", { name: /Vào phòng thi đấu/i })).toBeEnabled();
    expect(joined).toHaveLength(1);
    await expect(page.getByRole("heading", { name: "Tham gia workshop", exact: true })).toBeVisible();
  });
}

test("full room renders an actionable eight-team message", async ({ page }) => {
  await backend(page, "room_team_limit_reached");
  await page.goto("/join/ABC234/");
  await page.getByLabel("Tên đội của bạn:").fill(team.name);
  await page.getByRole("button", { name: /Vào phòng thi đấu/i }).click();
  await expect(page.getByRole("alert")).toHaveText("Phòng đã đủ 8 đội.");
});
