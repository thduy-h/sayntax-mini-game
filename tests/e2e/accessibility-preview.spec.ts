import { expect, test } from "@playwright/test";

test("all twelve scenarios have working previews and keyboard comparison does not advance the question", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /Chơi Accessibility Unlock/ }).click();
  await page.getByRole("button", { name: "Mở toàn bộ ngân hàng 12 câu" }).click();

  for (let index = 0; index < 12; index++) {
    const preview = page.locator(".simulator-card");
    await expect(page.locator(".scenario-story-header .eyebrow")).toContainText(`A${String(index + 1).padStart(2, "0")}`);
    if (index === 4) {
      await preview.getByRole("button", { name: "Lưu", exact: true }).click();
      await expect(preview.getByRole("status")).toContainText("Bạn vừa chọn: Lưu");
    }
    if (index === 5) {
      await preview.getByRole("button", { name: "Màu trạng thái 1" }).click();
      await expect(preview.getByRole("status")).toContainText("Chỉ có màu");
    }
    if (index === 6) {
      await preview.getByRole("button", { name: "Mô phỏng hết thời gian" }).click();
      await expect(preview).toContainText("Phiên mẫu đã hết hạn");
    }
    if (index === 7) {
      await expect(preview.locator(".sim-motion-track span")).toHaveCSS("animation-name", "none");
      await preview.getByRole("button", { name: "Dừng chuyển động" }).click();
      await expect(preview.getByRole("button", { name: "Tiếp tục demo" })).toBeVisible();
    }
    if (index === 8) {
      await preview.getByRole("button", { name: "Thử khi không thấy ảnh" }).click();
      await expect(preview.getByRole("status")).toContainText("tên tệp không cho biết địa điểm");
    }
    if (index === 9) {
      await preview.getByRole("button", { name: "Đọc và thử làm theo" }).click();
      await expect(preview.getByRole("status")).toContainText("Bạn có tìm được");
    }
    if (index === 10) {
      await preview.getByRole("button", { name: "Gửi bài mẫu" }).click();
      await expect(preview.getByRole("status")).toContainText("chỉ phát tiếng báo");
    }
    if (index === 11) {
      await preview.getByRole("button", { name: "Khóa học", exact: true }).click();
      await expect(preview.getByRole("status")).toContainText("Menu đã đổi thứ tự");
    }
    // A partial answer still permits comparison; comparing does not alter XP.
    await page.locator(".option-card").nth(index === 10 ? 1 : 0).click();
    const before = preview.getByRole("button", { name: "Trước khi sửa", exact: true });
    await before.focus();
    await page.keyboard.press("Enter");
    await expect(before).toHaveAttribute("aria-pressed", "true");
    await preview.getByRole("button", { name: "Sau khi sửa", exact: true }).click();
    await expect(preview.getByText("Đã tối ưu A11y")).toBeVisible();
    if (index === 10) {
      await preview.getByRole("button", { name: "Gửi bài mẫu" }).focus();
      await page.keyboard.press("Space");
      await expect(preview.getByRole("status")).toContainText("Đã gửi bài thành công");
      await expect(page.locator(".points-badge")).toContainText("35 XP");
    }
    if (index === 8) {
      await preview.getByRole("button", { name: "Thử khi không thấy ảnh" }).click();
      await expect(preview.getByRole("status")).toContainText("phòng A201");
    }
    await page.getByRole("button", { name: index === 11 ? /Xem tổng kết điểm số/ : /Tiếp tục sang tình huống tiếp/ }).click();
  }
  await expect(page.getByText("1135", { exact: false }).first()).toBeVisible();
});
