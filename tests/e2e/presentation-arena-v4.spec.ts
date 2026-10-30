import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test.describe("SAYNTAX Game Arena V4 — Presentation & Visual Challenges", () => {
  test("end-to-end presentation flow with persistent QR and visual A11y challenges", async ({ page }, info) => {
    const dir = "artifacts/ui-review-v4-presentation";
    await mkdir(dir, { recursive: true });

    // Track network requests to ensure presentation makes no leak calls
    const requests: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/functions/v1/")) requests.push(r.url());
    });

    // ── 1. PRESENTATION LANDING SCREEN WITH QR ──────────────────────────
    await page.goto("/competition/preview");
    await expect(page.getByText("STANDALONE · XEM THỬ GIAO DIỆN", { exact: true })).toBeVisible();

    // Switch to Presentation mode
    await page.getByRole("button", { name: "Màn hình trình chiếu", exact: true }).click();

    // Verify Landing Screen elements (Futuristic Midnight Theme)
    await expect(page.getByText("ĐẤU TRƯỜNG LẬP TRÌNH & THIẾT KẾ TIẾP CẬN")).toBeVisible();
    await expect(page.getByText("CHẶNG 1 · ACCESSIBILITY UNLOCK")).toBeVisible();
    await expect(page.getByText("CHẶNG 2 · ROBOT COMMANDS")).toBeVisible();
    await expect(page.getByText("QUY THỨC THI ĐẤU:")).toBeVisible();

    // Verify Central Showcase Artwork is visible and non-empty
    await expect(page.locator(".landing-hero-showcase")).toBeVisible();
    await expect(page.locator(".card-a11y-float")).toBeVisible();
    await expect(page.locator(".card-code-float")).toBeVisible();
    await expect(page.locator(".card-robot-float")).toBeVisible();

    // Verify Persistent QR Panel on Landing
    const landingQr = page.locator(".presentation-join-panel img.join-panel-qr-img");
    await expect(landingQr).toBeVisible();
    await expect(page.getByText("SAYNTAX-PREVIEW", { exact: true })).toBeVisible();
    await expect(page.getByText("Quét mã QR bằng điện thoại để đăng ký đội thi")).toBeVisible();

    // Verify read-only: no admin buttons or submit inputs on presentation stage
    await expect(page.getByRole("button", { name: "Bắt đầu phiên 1" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Chốt phiên 1" })).toHaveCount(0);

    // Capture Screenshot 1: Presentation landing with QR (Redesigned Midnight Blue)
    await page.screenshot({
      path: `${dir}/${info.project.name}-01-presentation-landing.png`,
      fullPage: true,
    });

    // ── 1B. ACCESSIBILITY DEMO (PRACTICE) VERIFICATION ──────────────────
    // Switch to MC to display Accessibility Demo
    await page.getByRole("button", { name: "Màn hình MC", exact: true }).click();
    const demo1Btn = page.getByRole("button", { name: /Hiển thị Demo phiên 1/ });
    if (await demo1Btn.isVisible()) {
      await demo1Btn.click();
    }

    // Switch back to Presentation screen to inspect Demo in read-only presentation
    await page.getByRole("button", { name: "Màn hình trình chiếu", exact: true }).click();
    await expect(page.getByText("MÀN HÌNH MINH HỌA · TRÌNH CHIẾU MC")).toBeVisible();
    await expect(page.getByText("Demo · Nút xác nhận khó đọc")).toBeVisible();

    // Verify Mockup Canvas is NOT empty
    const demoMockup = page.locator(".a11y-mockup-container");
    await expect(demoMockup).toBeVisible();
    await expect(demoMockup.locator(".sim-contrast-box")).toBeVisible();
    await expect(demoMockup.getByText("SAYNTAX WORKSHOP · TIẾP CẬN SỐ")).toBeVisible();
    await expect(demoMockup.getByRole("button", { name: "Xác nhận tham gia" })).toBeVisible();
    await expect(demoMockup.getByText("1.8 : 1 (Thất bại WCAG AA")).toBeVisible();

    // Capture Screenshot: Accessibility Demo BEFORE
    await page.screenshot({
      path: `${dir}/${info.project.name}-demo-01-a11y-before.png`,
      fullPage: true,
    });

    // Verify on Presentation screen: Before/After buttons are disabled (only MC can control)
    await expect(demoMockup.getByRole("button", { name: "1. Trước khi sửa (BEFORE)", exact: true })).toBeDisabled();
    await expect(demoMockup.getByRole("button", { name: "2. Sau khi sửa (AFTER)", exact: true })).toBeDisabled();
    await expect(demoMockup.getByText("MC điều khiển")).toBeVisible();

    // Switch to MC to change Demo to AFTER state
    await page.getByRole("button", { name: "Màn hình MC", exact: true }).click();
    await page.getByRole("button", { name: "2. Sau khi sửa (AFTER)", exact: true }).click();

    // Switch back to Presentation screen and verify it synced to AFTER
    await page.getByRole("button", { name: "Màn hình trình chiếu", exact: true }).click();
    await expect(demoMockup.locator(".badge-pass")).toBeVisible();
    await expect(demoMockup.getByText("12.6 : 1 (Đạt chuẩn WCAG AAA)")).toBeVisible();
    await expect(demoMockup.getByText("GIẢI MÃ THỬ THÁCH & NGUYÊN TẮC TIẾP CẬN")).toBeVisible();
    await expect(demoMockup.getByText("WCAG 1.4.3 Contrast Minimum")).toBeVisible();

    // Capture Screenshot: Accessibility Demo AFTER
    await page.screenshot({
      path: `${dir}/${info.project.name}-demo-02-a11y-after.png`,
      fullPage: true,
    });

    // Test repeated switching: MC switches back to BEFORE, presentation syncs
    await page.getByRole("button", { name: "Màn hình MC", exact: true }).click();
    await page.getByRole("button", { name: "1. Trước khi sửa (BEFORE)", exact: true }).click();

    await page.getByRole("button", { name: "Màn hình trình chiếu", exact: true }).click();
    await expect(demoMockup.locator(".badge-fail")).toBeVisible();
    await expect(demoMockup.getByText("1.8 : 1 (Thất bại WCAG AA")).toBeVisible();

    // ── 2. ACCESSIBILITY OFFICIAL QUESTION WITH CONTEXTUAL ILLUSTRATION ──
    // Switch to MC to start official Stage 1
    await page.getByRole("button", { name: "Màn hình MC", exact: true }).click();
    await page.getByRole("button", { name: "Bắt đầu phiên 1", exact: true }).click();
    await expect(page.getByText("STAGE_1_ACTIVE", { exact: true })).toBeVisible();

    // Switch back to Presentation screen
    await page.getByRole("button", { name: "Màn hình trình chiếu", exact: true }).click();

    // Verify active challenge eyebrow and persistent QR panel
    await expect(page.getByText("PHIÊN 1 · THỬ THÁCH 1/6 · CHỈ XEM")).toBeVisible();
    const stage1Qr = page.locator(".presentation-side-rail img.join-panel-qr-img");
    await expect(stage1Qr).toBeVisible();
    await expect(page.getByText("SAYNTAX-PREVIEW", { exact: true })).toBeVisible();

    // Verify contextual visual challenge mockup
    const mockupContainer = page.locator(".a11y-mockup-container");
    await expect(mockupContainer).toBeVisible();
    await expect(page.getByText("MÔ PHỎNG THỰC TẾ")).toBeVisible();
    await expect(page.locator(".a11y-mockup-status-badge")).toContainText("BEFORE");

    // Before closure: verify Before/After compare buttons and reveal card are NOT visible
    await expect(page.locator(".a11y-compare-toolbar")).toHaveCount(0);
    await expect(page.locator(".a11y-reveal-card")).toHaveCount(0);

    // Capture Screenshot 2: Accessibility question with contextual illustration (BEFORE)
    await page.screenshot({
      path: `${dir}/${info.project.name}-02-a11y-question-illustration.png`,
      fullPage: true,
    });

    // ── 3. ACCESSIBILITY BEFORE/AFTER REVEAL ─────────────────────────────
    // Switch to MC and close the active challenge
    await page.getByRole("button", { name: "Màn hình MC", exact: true }).click();
    await page.getByRole("button", { name: "Đóng thử thách", exact: true }).first().click();

    // Switch back to Presentation screen
    await page.getByRole("button", { name: "Màn hình trình chiếu", exact: true }).click();

    // Verify challenge is finalized and reveal components appear
    await expect(page.getByText("Thử thách đã chốt! Xem kết quả và phân tích giải pháp bên dưới.")).toBeVisible();
    await expect(page.locator(".a11y-compare-toolbar")).toBeVisible();
    await expect(page.getByRole("button", { name: "1. Trước khi sửa (BEFORE)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "2. Sau khi sửa (AFTER)" })).toBeVisible();
    // Synchronized with MC: only MC can control, so on presentation they are disabled
    await expect(page.getByRole("button", { name: "1. Trước khi sửa (BEFORE)" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "2. Sau khi sửa (AFTER)" })).toBeDisabled();

    // Verify Reveal card with Core Principle, Explanation, and Options breakdown
    await expect(page.locator(".a11y-reveal-card")).toBeVisible();
    await expect(page.getByText("GIẢI MÃ THỬ THÁCH & NGUYÊN TẮC TIẾP CẬN")).toBeVisible();
    await expect(page.getByText("NGUYÊN TẮC TIẾP CẬN CỐT LÕI:")).toBeVisible();
    await expect(page.getByText("TẠI SAO PHƯƠNG ÁN ĐÚNG LÀ TỐI ƯU NHẤT?")).toBeVisible();

    // QR panel remains visible
    await expect(stage1Qr).toBeVisible();

    // Capture Screenshot 3: Accessibility Before/After reveal
    await page.screenshot({
      path: `${dir}/${info.project.name}-03-a11y-before-after-reveal.png`,
      fullPage: true,
    });

    // ── 4. ROBOT DEMO WITH PERSISTENT QR ────────────────────────────────
    // Switch to MC, finalize stage 1, and show demo for stage 2
    await page.getByRole("button", { name: "Màn hình MC", exact: true }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Chốt phiên 1", exact: true }).click();

    // Show Demo for Stage 2
    await page.getByRole("button", { name: "Hiển thị Demo phiên 2", exact: true }).click();

    // Switch to Presentation screen
    await page.getByRole("button", { name: "Màn hình trình chiếu", exact: true }).click();

    // Verify Demo stage is shown and persistent QR is visible
    await expect(page.getByText("MÀN HÌNH MINH HỌA · TRÌNH CHIẾU MC")).toBeVisible();
    await expect(page.locator(".presentation-side-rail img.join-panel-qr-img")).toBeVisible();
    await expect(page.getByText("SAYNTAX-PREVIEW", { exact: true })).toBeVisible();

    // Capture Screenshot 4: Robot Demo with persistent QR
    await page.screenshot({
      path: `${dir}/${info.project.name}-04-robot-demo-persistent-qr.png`,
      fullPage: true,
    });

    // ── 5. ROBOT ACTIVE CHALLENGE WITH PERSISTENT QR ────────────────────
    // Switch to MC and start Stage 2
    await page.getByRole("button", { name: "Màn hình MC", exact: true }).click();
    await page.getByRole("button", { name: "Bắt đầu phiên 2", exact: true }).click();

    // Switch to Presentation screen
    await page.getByRole("button", { name: "Màn hình trình chiếu", exact: true }).click();

    // Verify Stage 2 active challenge
    await expect(page.getByText("PHIÊN 2 · THỬ THÁCH 1/4 · CHỈ XEM")).toBeVisible();
    await expect(page.getByRole("grid")).toBeVisible();

    // QR panel remains visible and scannable
    await expect(page.locator(".presentation-side-rail img.join-panel-qr-img")).toBeVisible();

    // Capture Screenshot 5: Robot active challenge with persistent QR
    await page.screenshot({
      path: `${dir}/${info.project.name}-05-robot-active-challenge.png`,
      fullPage: true,
    });

    // ── 6. FINAL LEADERBOARD WITH PERSISTENT QR ─────────────────────────
    // Switch to MC and finalize Stage 2
    await page.getByRole("button", { name: "Màn hình MC", exact: true }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Chốt phiên 2", exact: true }).click();

    // Switch to Presentation screen
    await page.getByRole("button", { name: "Màn hình trình chiếu", exact: true }).click();

    // Verify Final Leaderboard
    await expect(page.getByText("Bảng xếp hạng CHÍNH THỨC")).toBeVisible();
    await expect(page.getByText("🏆 ĐỘI CHIẾN THẮNG: Đội mẫu 1")).toBeVisible();

    // QR panel remains visible on final leaderboard
    await expect(page.locator(".presentation-side-rail img.join-panel-qr-img")).toBeVisible();
    await expect(page.getByText("SAYNTAX-PREVIEW", { exact: true })).toBeVisible();

    // Capture Screenshot 6: Final leaderboard with persistent QR
    await page.screenshot({
      path: `${dir}/${info.project.name}-06-final-leaderboard.png`,
      fullPage: true,
    });

    // ── RESPONSIVE OVERFLOW CHECK ───────────────────────────────────────
    // Verify no horizontal overflow on either desktop or mobile 390px
    const isNoOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    );
    expect(isNoOverflow).toBe(true);

    // Verify zero unauthorized external API calls
    expect(requests).toEqual([]);
  });

  test("accessibility demo interactive flow and scoring isolation", async ({ page }) => {
    await page.goto("/competition/preview");
    // Show demo from MC
    await page.getByRole("button", { name: "Màn hình MC", exact: true }).click();
    const demoBtn = page.getByRole("button", { name: /Hiển thị Demo phiên 1/ });
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
    }

    // Switch to Team screen
    await page.getByRole("button", { name: "Màn hình đội", exact: true }).click();

    // Verify demo is visible on team screen
    await expect(page.getByText("DEMO / PRACTICE — NOT SCORED")).toBeVisible();
    await expect(page.getByText("0 XP thi đấu")).toBeVisible();

    // Verify preview container is NOT empty
    const demoMockup = page.locator(".a11y-mockup-container");
    await expect(demoMockup.locator(".sim-contrast-box")).toBeVisible();
    await expect(demoMockup.getByText("SAYNTAX WORKSHOP · TIẾP CẬN SỐ")).toBeVisible();
    await expect(demoMockup.getByRole("button", { name: "Xác nhận tham gia" })).toBeVisible();

    // Verify Before/After buttons are disabled on Team screen (only MC controls them)
    await expect(page.locator(".a11y-compare-toolbar")).toBeVisible();
    await expect(page.getByRole("button", { name: "1. Trước khi sửa (BEFORE)" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "2. Sau khi sửa (AFTER)" })).toBeDisabled();
    await expect(page.getByText("MC điều khiển")).toBeVisible();

    // Verify MC can change Before/After mode and it syncs to Team screen
    await page.getByRole("button", { name: "Màn hình MC", exact: true }).click();
    await expect(page.getByRole("button", { name: "2. Sau khi sửa (AFTER)" })).toBeEnabled();
    await page.getByRole("button", { name: "2. Sau khi sửa (AFTER)" }).click();

    // Switch back to Team screen and verify it synced to AFTER
    await page.getByRole("button", { name: "Màn hình đội", exact: true }).click();
    await expect(demoMockup.locator(".badge-pass")).toBeVisible();
    await expect(page.getByRole("button", { name: "2. Sau khi sửa (AFTER)" })).toHaveClass(/active/);
    await expect(page.getByRole("button", { name: "2. Sau khi sửa (AFTER)" })).toBeDisabled();

    // MC switches back to BEFORE
    await page.getByRole("button", { name: "Màn hình MC", exact: true }).click();
    await page.getByRole("button", { name: "1. Trước khi sửa (BEFORE)" }).click();

    // Team screen synced to BEFORE
    await page.getByRole("button", { name: "Màn hình đội", exact: true }).click();
    await expect(demoMockup.locator(".badge-fail")).toBeVisible();
    await expect(page.getByRole("button", { name: "1. Trước khi sửa (BEFORE)" })).toHaveClass(/active/);

    // Select option "contrast"
    await page.getByRole("button", { name: /Đổi chữ sang màu tối/ }).click();
    await expect(page.getByText("Đã chọn đáp án demo.")).toBeVisible();

    // Verify team score remains 0 XP
    await expect(page.getByText("0 XP thi đấu")).toBeVisible();

    // Reset demo
    await page.getByRole("button", { name: "Làm lại demo" }).click();
    await expect(page.getByRole("button", { name: "Làm lại demo" })).toHaveCount(0);

    // Refresh page and re-activate demo from MC to verify clean re-render after refresh
    await page.reload();
    await page.getByRole("button", { name: "Màn hình MC", exact: true }).click();
    const reloadDemoBtn = page.getByRole("button", { name: /Hiển thị Demo phiên 1/ });
    if (await reloadDemoBtn.isVisible()) {
      await reloadDemoBtn.click();
    }
    await page.getByRole("button", { name: "Màn hình đội", exact: true }).click();
    await expect(page.locator(".a11y-mockup-container")).toBeVisible();
  });
});
