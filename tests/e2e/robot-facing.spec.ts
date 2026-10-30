import { expect, test, type Page } from "@playwright/test";

async function expectFacing(page: Page, direction: number, position: number) {
  const sprite = page.getByRole("img", { name: /^Robot đang nhìn hướng/ });
  await expect(sprite).toHaveCount(1);
  await expect(page.locator(".board-cell").nth(position)).toContainText("▲");
  await expect(sprite.locator(".robot-facing")).toHaveAttribute("data-direction", String(direction));
  const expected = ["matrix(1, 0, 0, 1, 0, 0)", "matrix(0, 1, -1, 0, 0, 0)", "matrix(-1, 0, 0, -1, 0, 0)", "matrix(0, -1, 1, 0, 0, 0)"][direction];
  await expect(sprite.locator(".robot-facing")).toHaveCSS("transform", expected);
  await expect(sprite).toHaveAccessibleName(`Robot đang nhìn hướng ${["Bắc (↑)", "Đông (→)", "Nam (↓)", "Tây (←)"][direction]}`);
}

test("robot face follows all turns, movement, collision, reset and level changes", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Chơi Robot Commands/ }).click();
  await expectFacing(page, 1, 24);
  for (let index = 0; index < 4; index++) await page.locator(".command-palette .btn-right").click();
  await page.locator(".command-palette .btn-left").click();
  await page.locator(".command-palette .btn-forward").click();
  await page.locator(".command-palette .btn-right").click();
  await page.locator(".command-palette .btn-forward").click();
  await page.locator(".command-palette .btn-forward").click();
  for (const [direction, position] of [[2, 24], [3, 24], [0, 24], [1, 24], [0, 24], [0, 18], [1, 18], [1, 19], [1, 19]]) {
    await page.getByRole("button", { name: "Từng bước", exact: true }).click();
    await expectFacing(page, direction, position);
  }
  await page.screenshot({ path: `/tmp/sayntax-robot-facing-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expectFacing(page, 1, 24);
  await page.getByRole("button", { name: "Màn 5", exact: true }).click();
  await expectFacing(page, 3, 35);
  await page.getByRole("button", { name: "Màn 6", exact: true }).click();
  await expectFacing(page, 2, 7);
});

test("face keeps correct orientation during animated run with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /Chơi Robot Commands/ }).click();
  for (let index = 0; index < 4; index++) await page.locator(".command-palette .btn-forward").click();
  await page.getByRole("button", { name: "Chạy chương trình", exact: true }).click();
  await expectFacing(page, 1, 28);
  await expect(page.locator(".success-banner-enhanced")).toBeVisible();
});
