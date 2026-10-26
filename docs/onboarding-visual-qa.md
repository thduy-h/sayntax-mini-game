# SAYNTAX — Persistent Hero Guidance & Global Voice QA

## Quyết định thiết kế mới: Bố cục Hero hai cột ổn định

Thay vì biến mất khi hoàn thành làm quen, khu vực hướng dẫn ở cột bên phải hero luôn luôn tồn tại ổn định, chỉ thay đổi nội dung phù hợp với trạng thái người dùng:

- **Cột trái:** Giới thiệu SAYNTAX, thông điệp sản phẩm và CTA chính ("Học thử ngay — Miễn phí →", "Xem hướng dẫn", lời nhắc lệnh giọng nói và cam kết điều khiển rảnh tay).
- **Cột phải:** Khu vực hướng dẫn thường trực:
  - **Trạng thái 1 — Người dùng mới:** Hiển thị onboarding 3 bước tương tác:
    - `1/3`: Làm quen với giọng nói (chào mừng, trạng thái micro, nói "Trợ giúp", nút mở bảng điều khiển micro).
    - `2/3`: Thử điều khiển website (nói "Cuộn xuống", xác nhận thao tác cuộn).
    - `3/3`: Sẵn sàng học (thông báo sẵn sàng, nhắc nói "Học thử", nút "Hoàn tất làm quen →").
  - **Trạng thái 2 — Đã hoàn thành hoặc bỏ qua:** Thay bằng **Bảng hướng dẫn nhanh** có giá trị sử dụng lâu dài:
    - Tiêu đề: **"BẠN CÓ THỂ NÓI GÌ VỚI SAYNTAX?"**
    - Giới thiệu ngắn về khả năng điều khiển website bằng giọng nói tiếng Việt rảnh tay.
    - Ba câu lệnh thực tế: `"Trợ giúp"` (Mở hướng dẫn), `"Cuộn xuống"` (Di chuyển trang), `"Học thử"` (Khám phá bài học).
    - Liên kết `"Làm quen lại từ đầu"` để khởi động lại onboarding bất cứ khi nào người dùng muốn.
    - Liên kết `"Xem toàn bộ câu lệnh →"` dẫn tới `/voice-guide`.
    - Không trùng lặp CTA "Học thử ngay" với cột trái.

## Giữ nguyên Global Voice Control Card ở góc dưới bên phải

- Card nổi cố định ở **góc dưới bên phải** màn hình (`fixed z-[var(--z-global-voice)] right-3 bottom-3 sm:right-4 sm:bottom-4`).
- Phong cách neo-brutalist, viền đen 2px/3px, shadow offset `[4px_4px_0_#121212]` và `[6px_6px_0_#121212]`.
- Không chuyển thành thanh ngang trên đỉnh hay đáy màn hình.
- Không đưa microphone control vào hero hay card hướng dẫn.
- Hiển thị đầy đủ:
  - Trạng thái micro (Chưa bật / Đang khởi động / Đang nghe / Đang xử lý / Đã thực hiện / Lỗi).
  - Câu vừa nhận dạng (`lastResult.command` hoặc `speech.interimTranscript`).
  - Lệnh đã hiểu (`lastResult.understoodAs`).
  - Kết quả thực hiện (`lastResult.feedback`).
  - Nút bật/tắt micro (`Mic` / `MicOff`).
  - Nút mở rộng/thu gọn (`ChevronUp` / `ChevronDown`).
- Safe-area support cho mobile (`bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))]`).
- Khi zoom 125–200%, giữ kích thước hợp lý, không kéo dãn thành thanh ngang toàn màn hình.
- Không thêm khoảng đệm lớn nhân tạo trên toàn website.

## Kết quả kiểm thử tự động (Browser Visual QA)

Đã chạy kiểm thử tự động qua [test script](../scripts/test-onboarding-visual-qa.mjs) trên các cấu hình:
1. `fhd-100` (1920×1080 @ 100%)
2. `fhd-125` (1920×1080 @ 125%)
3. `fhd-150` (1920×1080 @ 150%)
4. `desktop-1366` (1366×768 @ 100%)
5. `mobile-390` (390×844)

Tất cả 5 cấu hình đều **PASS 100%** qua toàn bộ 6 trạng thái yêu cầu:
- **Onboarding 1/3:** [fhd-100-01-onboarding-1-3.png](../artifacts/onboarding-layout-qa/fhd-100-01-onboarding-1-3.png)
- **Onboarding 2/3:** [fhd-100-02-onboarding-2-3.png](../artifacts/onboarding-layout-qa/fhd-100-02-onboarding-2-3.png)
- **Onboarding 3/3:** [fhd-100-03-onboarding-3-3.png](../artifacts/onboarding-layout-qa/fhd-100-03-onboarding-3-3.png)
- **Đã hoàn thành:** [fhd-100-04-completed.png](../artifacts/onboarding-layout-qa/fhd-100-04-completed.png)
- **Bỏ qua:** [fhd-100-05-skipped.png](../artifacts/onboarding-layout-qa/fhd-100-05-skipped.png)
- **Returning user:** [fhd-100-06-returning-user.png](../artifacts/onboarding-layout-qa/fhd-100-06-returning-user.png)
- **Global Voice mở rộng:** [fhd-100-07-global-voice-expanded.png](../artifacts/onboarding-layout-qa/fhd-100-07-global-voice-expanded.png)

Mobile 390×844:
- [mobile-390-01-onboarding-1-3.png](../artifacts/onboarding-layout-qa/mobile-390-01-onboarding-1-3.png)
- [mobile-390-04-completed.png](../artifacts/onboarding-layout-qa/mobile-390-04-completed.png)
- [mobile-390-07-global-voice-expanded.png](../artifacts/onboarding-layout-qa/mobile-390-07-global-voice-expanded.png)

Bộ sưu tập trực quan đầy đủ: [Gallery HTML](../artifacts/onboarding-layout-qa/index.html) · [Báo cáo JSON](../artifacts/onboarding-layout-qa/report.json).

## Kiểm tra chất lượng mã nguồn

- `npm run lint`: **PASS** (0 warnings, 0 errors).
- `npm run typecheck`: **PASS** (toàn bộ workspaces).
- `npm test`: **PASS** (tất cả unit tests và integration tests).
- `npm run build`: **PASS** (tạo thành công production build và 14 static pages).
