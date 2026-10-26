# Landing & Knowledge Workspace — visual refinement

Branch `gemini-ui`, 26/10/2026. Không merge hoặc deploy.

## Landing

Giữ hai cột desktop, tự xếp dọc trên mobile. Không đặt chiều cao cố định hoặc thêm nội dung lấp chỗ trống.

- Hero trái giữ thông điệp chính, một CTA “Học thử ngay — Miễn phí” và liên kết hướng dẫn nhẹ hơn. Phần người hỗ trợ bật micro có sự đồng ý được giữ thành một đoạn ngắn. Các thông tin học thử không cần tài khoản, tiếng Việt và không cần cài đặt nằm cùng hàng thông tin nhỏ.
- Card phải bỏ các mục đánh số và phần giải thích lặp lại. Thay bằng tiêu đề giọng nói, cách xem trạng thái ở góc phải, hai câu lệnh “Học thử” / “Trợ giúp”, liên kết toàn bộ câu lệnh và lời nhắc kéo thả không cần bật micro. Không có task onboarding, tiến độ hoặc trạng thái hoàn thành.
- Giữ lời nhắc khám phá hai cách học một lần ở đoạn chuyển tiếp. Không nhân đôi câu “Hãy nói Học thử” hoặc CTA lớn trong hai card cạnh nhau.
- Các section hai phương thức và lộ trình năm bài vẫn giữ cấu trúc. Sửa lỗi chữ “mảnh ghép logo” thành “mảnh ghép”.

## Knowledge: giữ kiến thức, đổi cách trình bày

Đã đối chiếu bản chụp dữ liệu trước lượt sửa với dữ liệu sau: tất cả trường `concept`, `purpose`, `example`, `goal` của năm bài và toàn bộ nội dung sẵn có của bảy phần Bài 1 (`explanation`, `example`, `practice`, `program`, `steps`) giữ nguyên. Chỉ bổ sung loại minh họa và ý ghi nhớ. Đổi thứ tự trình bày một số đoạn để hình minh họa xuất hiện sớm hơn.

Bài 1 vẫn giải thích đủ chương trình, Blockly/khối lệnh, Bắt đầu, In/đầu ra, ghép nối và trình tự, ví dụ hoàn chỉnh, tạo khác chạy, kiểm tra/sửa/chạy lại và bốn thao tác thực hành. Bài 2–5 giữ nội dung hiện có, bổ sung minh họa cho chính khái niệm đang dạy, không thêm mục tiêu hoặc bước học.

| Minh họa | Giá trị giảng dạy |
| --- | --- |
| Lấy cốc → Rót nước → Khuấy đều | Biến khái niệm chỉ dẫn và thứ tự thành việc quen thuộc |
| Bắt đầu → In “Xin chào” → Kết quả | Phân biệt điểm khởi động, hành động và đầu ra; ghi rõ kết quả không phải một khối |
| Tên In và ô Xin chào | Giải thích hành động so với nội dung có thể chỉnh sửa |
| Vai trò Bắt đầu / In | Hai khối có nhiệm vụ khác nhau; In không phải in ra giấy |
| Hai khối In và hai dòng đầu ra | Liên hệ thứ tự khối với kết quả |
| Tạo → Chạy → Quan sát | Giúp hiểu xếp khối chưa có nghĩa chương trình đã thực hiện |
| Lặp / điều kiện / biến | Làm rõ lệnh nằm trong vòng lặp, đúng/sai, và giá trị tại thời điểm In |

Minh họa là HTML có figure/caption, danh sách, nhãn và bảng đơn giản. Không giả lập khối Blockly tương tác hoặc thay cấu trúc engine. Ý ghi nhớ dùng nền pastel và nhãn chữ, không chỉ phân biệt bằng màu. Giữ chữ thân bài 16px, line-height thoáng, heading có cấu trúc và tabpanel có accessible name. Không thêm nút vào bài đọc.

Các cột bài đọc và sơ đồ dùng container queries theo chiều rộng thực tế của vùng đọc; khi Global Voice mở rộng, sơ đồ tự xếp lại thay vì tiếp tục chia cột theo chiều rộng cửa sổ.

## Floating scroll hint và Global Voice

Hint là pill nhỏ với viền/shadow nhẹ, được đặt tuyệt đối ở đáy workspace, bên ngoài scroll container. Không có footer element hoặc dải chân trang riêng chứa hint. Một khoảng đệm an toàn 48px tách vùng chữ khỏi pill; nền liên tục với bài đọc.

Đo overflow theo toàn bộ chiều cao workspace trước khi dành khoảng đệm, tránh làm bài ngắn phải cuộn vì chính hint. Hint hiện ở đầu/giữa, ẩn ở cuối; khoảng đệm giữ ổn định để không nhảy bố cục. Sang Thực hành thì cả Knowledge và hint được tháo khỏi DOM.

Giữ `scrollPrimer` và luồng Global Voice hiện có: “Cuộn xuống” cuộn Knowledge, không đổi tab, cuộn document hoặc pan Blockly. Không sửa parser/ASR. Khi HUD mở rộng trên desktop và có đủ chiều rộng, Knowledge dùng vùng trống cạnh HUD. Trên màn hình hẹp, HUD chi tiết vẫn là overlay hiện có; hint tạm ẩn nếu không còn chỗ an toàn và trở lại khi thu gọn HUD. Nút thu gọn vẫn truy cập được. Không thay component Global Voice.

## QA và screenshots

Browser QA chạy Playwright với Microsoft Edge headless trên ứng dụng thật tại localhost. Zoom dùng `chrome.tabs.setZoom` và xác nhận bằng `getZoom`, `innerWidth`; đây là tab zoom của browser, không chỉ mô phỏng bằng deviceScaleFactor. Extension chỉ được tạo trong thư mục tạm của QA và được xóa sau khi chạy, không đưa vào ứng dụng.

| Profile | Landing / navigation | Knowledge đầu–giữa–cuối, Thực hành | Voice scroll / keyboard / một mic | HUD mở rộng |
| --- | --- | --- | --- | --- |
| 1366×768 | Đạt | Đạt | Đạt | Đạt |
| 1920×1080, 100% | Đạt | Đạt | Đạt | Đạt |
| 1920×1080, zoom 125% | Đạt | Đạt | Đạt | Đạt |
| 1920×1080, zoom 150% | Đạt | Đạt | Đạt | Đạt |
| 1920×1080, zoom 200% | Đạt | Đạt | Đạt | Đạt |
| Mobile viewport 390×844 | Đạt | Đạt | Đạt | Đạt |

Kiểm tra thêm: hai cột desktop cân đối; một CTA chính trong hero; không có progress onboarding; không overflow ngang cả document và sơ đồ; không có CTA trong Knowledge; hint không che chữ/HUD; lời nói không liên quan không làm mắc kẹt; “Học thử” và “Trợ giúp” điều hướng thật; không tự bật mic. Bốn primer còn lại có minh họa/ghi nhớ và không xuất hiện hint khi đủ chỗ ở viewport cao. Browser report không ghi nhận page error.

- [So sánh trước/sau cùng viewport desktop/mobile](../artifacts/visual-refinement-qa/index.html).
- [Gallery toàn bộ ảnh sau sửa](../artifacts/visual-refinement-qa/after/index.html).
- Bài 1 desktop: [đầu](../artifacts/visual-refinement-qa/after/desktop-1366-knowledge-top.png), [minh họa mới](../artifacts/visual-refinement-qa/after/desktop-1366-knowledge-program-visual.png), [giữa](../artifacts/visual-refinement-qa/after/desktop-1366-knowledge-middle.png), [cuối](../artifacts/visual-refinement-qa/after/desktop-1366-knowledge-bottom.png).
- Mobile: [landing](../artifacts/visual-refinement-qa/after/mobile-390-landing-full.png), [Knowledge](../artifacts/visual-refinement-qa/after/mobile-390-knowledge-program-visual.png).
- [Report máy đọc được](../artifacts/visual-refinement-qa/after/report.json).

Chạy lại khi ứng dụng đang mở tại localhost:3000:

```sh
PLAYWRIGHT_MODULE=/tmp/aegis-browser-check/node_modules/playwright/test.mjs \
QA_BROWSER=/etc/profiles/per-user/thduy-h/bin/microsoft-edge \
node scripts/test-visual-refinement-qa.mjs
```

Hai biến trên là đường dẫn của môi trường hiện tại; có thể bỏ nếu Playwright và Chromium mặc định đã được cài. `QA_PROFILE` hỗ trợ chọn profile, `QA_BASE_URL` và `QA_OUTPUT` hỗ trợ đổi server/thư mục ảnh.

## Files thay đổi trong lượt này

- `apps/web/app/page.tsx`
- `apps/web/features/onboarding/components/first-time-guidance.tsx`
- `apps/web/features/lesson-v2/utils/lesson-primer.ts`
- `apps/web/features/lesson-v2/components/knowledge-primer-content.tsx`
- `apps/web/features/lesson-v2/components/primer-illustration.tsx` (mới)
- `apps/web/features/lesson-v2/components/voice-lesson-client.tsx`
- `apps/web/features/lesson-v2/utils/knowledge-primer-voice-scroll.test.ts`
- `scripts/test-visual-refinement-qa.mjs` (mới)
- `scripts/test-knowledge-depth-qa.mjs`: cập nhật selector của ví dụ hoàn chỉnh vì nay có nhiều figure
- Tài liệu này và `artifacts/visual-refinement-qa/`

Worktree đã có các thay đổi từ những lượt trước. Không revert hoặc nhận chúng là phần sửa mới của task này. Hash Global Voice, lesson seed và entry parser khớp bản trước lượt sửa. Không thay voice architecture, ASR, authentication, progress persistence, database, validation, 5 bài / 25 bước hoặc developer command behavior. Không thêm thư viện.

## Giới hạn kiểm chứng

Voice QA giả lập đầu vào `SpeechRecognition`, chạy routing/executor thật; chưa xác minh microphone, audio hoặc ASR thật. Chưa thử screen reader, thiết bị mobile vật lý, browser khác hoặc nghiên cứu khả năng hiểu bài với người học. Ảnh được xem và kiểm tra hình học; chưa có baseline pixel-diff tự động. Trên mobile, HUD mở rộng vẫn che một phần trang theo thiết kế overlay hiện có; thu gọn để đọc tiếp, hint không hiển thị phía dưới overlay.

## Checks cuối

| Lệnh | Kết quả |
| --- | --- |
| `npm run lint` | Đạt, exit 0 |
| `npm run typecheck` | Đạt trên các workspaces, exit 0 |
| `npm test` | Đạt, gồm parser, engine, voice routing, primer và mapping 5 bài / 25 bước |
| `npm run build` | Đạt, exit 0 |
| `git diff --check` | Đạt |

Build còn cảnh báo `metadataBase` chưa được cấu hình, dùng fallback localhost; không phải lỗi build. [Checks và hash đối chiếu nội dung gốc](../artifacts/visual-refinement-qa/checks.json) xác nhận không có phần nội dung sư phạm cũ bị cắt. Browser QA tạo 47 ảnh sau sửa và 6 ảnh trước sửa, với 6 profile đạt và 4 primer còn lại được kiểm tra bổ sung.
