# Knowledge Primer: khôi phục chiều sâu và kiểm chứng

Ngày kiểm tra: 26/10/2026. Branch: `gemini-ui`. Không merge hoặc deploy.

## Đối chiếu trước và sau

Đã đọc diff đang có trong worktree và lịch sử của `lesson-primer.ts` / `voice-lesson-client.tsx`, gồm HEAD `85cba95` và các thay đổi primer trước đó. Bản trong HEAD có bốn trường tóm tắt cho mỗi bài; riêng Bài 1 còn có giải thích chương trình, kết nối khối, lý do chạy và hai phương thức tạo chương trình trong renderer. Lượt polish đang có trong worktree đã bỏ phần giải thích chương trình kèm minh họa và hai phương thức; các ý kết nối/chạy còn lại quá ngắn.

Không tìm thấy một bài giảng dài hoàn chỉnh trong lịch sử đã kiểm tra. Vì vậy, thay đổi này khôi phục những ý hữu ích đã mất và bổ sung giải thích theo yêu cầu, không coi toàn bộ nội dung mới là bản phục hồi nguyên văn.

| Nội dung | Trước lượt sửa này | Sau |
| --- | --- | --- |
| Chương trình | Định nghĩa tóm tắt | Giải thích chỉ dẫn cụ thể, ví dụ công thức nước chanh và liên hệ chương trình chào |
| Khối lệnh / Blockly | Một câu về khối và kết nối | Giải thích khối, ô nội dung, vùng xếp khối và vùng kết quả; giọng nói/kéo thả cùng tạo khối |
| Bắt đầu / In / đầu ra | Nêu tên và chức năng ngắn | Vì sao SAYNTAX cần Bắt đầu; In hiển thị ra màn hình; đầu ra là kết quả quan sát được |
| Trình tự | Ghép ngàm từ trên xuống | Phân biệt đứng gần với nối khối; ví dụ đổi thứ tự lời chào và lời tạm biệt |
| Chương trình hoàn chỉnh | Chuỗi chữ ngắn | Minh họa chuỗi Bắt đầu → In và đầu ra Xin chào, phân biệt hình minh họa với chương trình đang làm |
| Tạo và chạy | So sánh bản thiết kế | Giải thích chuẩn bị chỉ dẫn, thực hiện, sửa nội dung rồi chạy lại; cách kiểm tra khi chưa đúng |
| Áp dụng | Mục tiêu một câu | Bốn thao tác khớp bốn bước thực tế của Bài 1, mỗi thao tác có cách nói và kéo thả; câu hỏi tự kiểm tra |

Mỗi phần Bài 1 có giải thích, ví dụ và liên hệ thực hành. Không render thêm bốn card tóm tắt trước những phần đã giải thích cùng chủ đề. Giữ một minh họa chương trình đầy đủ; bỏ CTA lớn Bắt đầu/Tiếp tục học trong nội dung Knowledge vì tab Thực hành và điều khiển hiện có đã đảm nhiệm điều hướng. Không rút chữ để vừa một màn hình.

Đã rà soát cả năm bài. Không có bằng chứng bốn bài còn lại từng có bài giảng dài bị xóa, nên giữ cấu trúc bốn trường. Khôi phục ví dụ đầu ra cụ thể của Bài 2/3/5, làm rõ lệnh nằm trong vòng lặp, nhánh điều kiện sai và giá trị biến sau lần gán mới. Tránh mô tả biến theo cách khiến người học hiểu nhầm kết quả đã in sẽ tự đổi. Không thay mục tiêu, steps hoặc validators. Bài 1 vẫn có 4 bước; toàn bộ 5 bài vẫn có 25 bước.

## Vùng đọc và gợi ý cuộn

- Nội dung Knowledge có vùng cuộn riêng và semantic `tabpanel`; tiêu đề/đoạn văn/ví dụ có cấu trúc, chữ thân bài 16px.
- Gợi ý “↓ Còn nội dung bên dưới / Nói ‘Cuộn xuống’ để xem tiếp” nằm ở footer của vùng nhìn thấy, ngoài nội dung cuộn.
- Chỉ dành chỗ cho footer nếu nội dung vượt chiều cao toàn bộ workspace. Nội dung ngắn không bị tạo thêm overflow do hint.
- Ở cuối, hint ẩn nhưng chỗ footer giữ ổn định để tránh nhảy bố cục hoặc hiện/ẩn lặp lại. Cuộn lên làm hint xuất hiện lại.
- Knowledge đo phần không gian phía trên HUD hiện có, theo dõi resize và cleanup listener/observer. Không sửa Global Voice góc dưới phải trong lượt này.
- Tái sử dụng executor `scrollPrimer` và routing hiện có. “Cuộn xuống” không đổi tab, không cuộn document hoặc pan Blockly. Sang Thực hành vẫn dùng tab, điều khiển và lệnh đã có.

## Regression và browser QA

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`: đều exit 0. Build còn cảnh báo `metadataBase` chưa được cấu hình; không phải lỗi build.

Unit/regression kiểm tra đầu ra minh họa bằng engine thật và expected output của bước cuối; số thao tác thực hành khớp lesson; các chủ đề có đủ giải thích/ví dụ/liên hệ; đủ năm primer; hợp đồng cuộn và không còn CTA trùng lặp.

Browser QA bằng Playwright/Edge đã chạy trên ứng dụng thật tại localhost:

| Profile | Nội dung / hint đầu–giữa–cuối | Voice scroll / bàn phím | Không chồng hint và HUD thu gọn |
| --- | --- | --- | --- |
| 1366×768 | Đạt | Đạt | Đạt |
| 1920×1080 | Đạt | Đạt | Đạt |
| FHD reflow tương đương 150% | Đạt | Đạt | Đạt |
| FHD reflow tương đương 200% | Đạt | Đạt | Đạt |
| Mobile viewport 390×844 | Đạt | Đạt | Đạt |

Kiểm tra thêm: không overflow ngang; không có button trong nội dung Knowledge; nói sai vẫn đọc tiếp được; lệnh xuống cuối/đầu và đổi tab hoạt động; không tự bật mic; một phiên mic dùng chung. Bốn primer còn lại vừa viewport cao thì không có hint hoặc overflow giả. Report không ghi nhận page error.

Giới hạn: giả lập đầu vào `SpeechRecognition`, chạy Global Voice/routing/executor thật; chưa kiểm chứng audio/microphone/ASR thật. Zoom được mô phỏng bằng viewport reflow và deviceScaleFactor, chưa kiểm tra browser-toolbar/OS zoom. Chưa kiểm chứng screen reader, điện thoại vật lý, HUD mở rộng hoặc khả năng hiểu bài qua nghiên cứu với học viên. Đây là kiểm tra hình học, screenshot và xem ảnh, chưa có baseline pixel-diff.

## Ảnh và báo cáo

- Bài 1 desktop: [đầu](../artifacts/knowledge-depth-qa/desktop-1366-01-top.png), [giữa](../artifacts/knowledge-depth-qa/desktop-1366-02-middle.png), [cuối](../artifacts/knowledge-depth-qa/desktop-1366-03-bottom.png).
- Bài 1 mobile: [đầu](../artifacts/knowledge-depth-qa/mobile-390-01-top.png), [giữa](../artifacts/knowledge-depth-qa/mobile-390-02-middle.png), [cuối](../artifacts/knowledge-depth-qa/mobile-390-03-bottom.png).
- [Gallery đủ 15 ảnh, gồm FHD và reflow zoom](../artifacts/knowledge-depth-qa/index.html).
- [Browser report](../artifacts/knowledge-depth-qa/report.json).

Chạy lại với ứng dụng đang mở tại port 3000:

```sh
PLAYWRIGHT_MODULE=/tmp/aegis-browser-check/node_modules/playwright/test.mjs \
QA_BROWSER=/etc/profiles/per-user/thduy-h/bin/microsoft-edge \
node scripts/test-knowledge-depth-qa.mjs
```

Đường dẫn Playwright/browser là của môi trường QA hiện tại; có thể bỏ các biến nếu Playwright và Chromium đã được cài theo cấu hình mặc định.

## Files thuộc lượt sửa này

- `apps/web/features/lesson-v2/utils/lesson-primer.ts`: dữ liệu nội dung.
- `apps/web/features/lesson-v2/components/knowledge-primer-content.tsx`: renderer tài liệu học.
- `apps/web/features/lesson-v2/components/voice-lesson-client.tsx`: vùng đọc, hint, semantic và bỏ CTA dư.
- `apps/web/features/lesson-v2/utils/lesson-primer.test.ts`: regression nội dung/đầu ra.
- `apps/web/features/lesson-v2/utils/knowledge-primer-voice-scroll.test.ts` và `lesson-first-use.test.ts`: cập nhật hợp đồng UI.
- `apps/web/package.json`: thêm regression mới vào script test đang có.
- `scripts/test-knowledge-depth-qa.mjs`, `artifacts/knowledge-depth-qa/`, tài liệu này: QA và bằng chứng.

Worktree đã có thay đổi từ trước ở onboarding, Global Voice, trang demo, lesson seed, toolbar và các file QA khác. Giữ nguyên những thay đổi đó; không quy chúng là phần triển khai của task này. Hash của Global Voice và lesson seed khớp bản trước lượt sửa. Không thay ASR, parser, database hoặc lesson engine trong lượt này.
