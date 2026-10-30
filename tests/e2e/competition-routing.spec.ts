import { expect, test } from "@playwright/test";

for (const route of ["/competition", "/competitive", "/competitive/"]) {
  test(`${route} opens competition and survives refresh`, async ({ page }) => {
    await page.goto(`${route}?source=bookmark#control`);
    await expect(page.getByRole("heading", { name: "Tổ chức cuộc thi hai giai đoạn" })).toBeVisible();
    expect(new URL(page.url()).pathname).toMatch(/^\/competition\/?$/);
    expect(new URL(page.url()).search).toBe("?source=bookmark");
    expect(new URL(page.url()).hash).toBe("#control");
    await expect(page.getByRole("button", { name: "Tạo cuộc thi", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Tổ chức cuộc thi hai giai đoạn" })).toBeVisible();
  });
}

test("legacy navigation exposes the official competition entry", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  }
  await page.getByRole("link", { name: "Cuộc thi hai giai đoạn MC", exact: true }).click();
  await expect(page).toHaveURL(/\/competition$/);
  await expect(page.getByRole("heading", { name: "Tổ chức cuộc thi hai giai đoạn" })).toBeVisible();
});

test("legacy alias preserves competition identity without granting MC access", async ({ page }) => {
  const id = "90000000-0000-0000-0000-000000000001";
  await page.goto(`/competitive/${id}`);
  await expect(page).toHaveURL(new RegExp(`/competition/${id}$`));
  await expect(page.getByText("Không tìm thấy phiên quản trị", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tạo cuộc thi", exact: true })).toHaveCount(0);
});
