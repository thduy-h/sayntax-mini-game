# Hướng dẫn MC

> 2026-11-01 V5 update: V5 keeps the projector open throughout: MC live demo, two independent official stages, then private results until the manually operated end-of-workshop ceremony. See [Competition V5 release review](competition-v5-release.md) for current rules, verification, screenshots and deployment gates.

## Competition V2 — current local candidate (2026-10-30)

Use the Vietnamese eight-team procedure below: Workshop1 → Accessibility10 minutes → provisional → Workshop2 (browsers may close) → restore same teams → Robot15 minutes → finalized results/tie resolution → one winner. Keep the MC browser session and save team recovery cards.

[Competition V2 guide](competition-v2.md) contains the authoritative architecture, scoring, deployment gates, rollback and rehearsal instructions. Historical audit entries below describe earlier candidates.

## Preset SAYNTAX Workshop 2026

Mặc định: tối đa 8 đội, Game 1 gồm 4 câu, Game 2 gồm 3 màn curated, không tính tốc độ, không dùng map procedural cho điểm workshop.

### Game 1 · 09:45–09:55 (10 phút)

- 09:45–09:47: chiếu QR, nói luật và cách chọn đáp án.
- 09:47–09:52: các đội làm 4 tình huống Accessibility.
- 09:52–09:55: khóa round, xem leaderboard và chốt nguyên tắc.

### Game 2 · 10:35–10:50 (15 phút)

- 10:35–10:38: hướng dẫn lệnh robot và cách Step.
- 10:38–10:46: các đội giải 3 màn.
- 10:46–10:50: so sánh Ghost Path, thảo luận tối ưu.

Trong standalone, điểm và đội là dữ liệu diễn tập. Khi Supabase hoạt động, cấu hình round phải được khóa trước khi bắt đầu và điểm authoritative phải do server tính.

### Hai phiên game riêng trong cùng một phòng

- MC tạo một phòng và giữ nguyên mã/QR cùng danh sách đội cho cả hai phiên.
- Khóa phòng, chọn **Chơi Accessibility Unlock**. MC ở lại bảng điều khiển; các đội chọn **Vào Accessibility Unlock** trên thiết bị của mình.
- Kết thúc phần chơi, MC chọn **Kết thúc game và tổng kết**. Màn tổng kết Accessibility hiển thị bảng điểm được máy chủ xác minh, tối đa 400 XP với preset bốn câu. Thiết bị đang chơi tự về phòng ở lần polling kế tiếp (mặc định khoảng 5 giây nếu mạng ổn định).
- Thảo luận kết quả trước khi mở game tiếp theo. Màn tổng kết hiện tại còn sau refresh và được thay thế khi MC bắt đầu phiên mới; giao diện này chưa cung cấp lịch sử các phiên cũ.
- Giữ nguyên phòng, chọn **Chơi Robot Commands** khi đến phiên Robot. Điểm khởi đầu của phiên mới là 0; điểm Accessibility không cộng vào Robot. Preset ba màn có tối đa 960 XP.
- Nếu muốn đổi bộ câu hỏi/màn chơi trước phiên sau: mở lại phòng chờ, sửa cấu hình, rồi khóa lại. Không thể mở lại phòng chờ khi một game đang chạy; phải kết thúc game trước.
- Kết thúc Robot bằng cùng nút **Kết thúc game và tổng kết**. Chỉ chọn **Đóng workshop** sau khi không còn phiên tiếp theo.

Hai game vẫn chơi độc lập trong chế độ tự do. Màn tổng kết workshop chỉ dùng dữ liệu máy chủ, không lấy điểm tự do hoặc điểm đội mô phỏng. Thay đổi này chỉ ở frontend, dùng API `arena-get-state` hiện có (điểm đã được lọc theo `roundId`); không cần migration hoặc deploy lại Edge Functions.
