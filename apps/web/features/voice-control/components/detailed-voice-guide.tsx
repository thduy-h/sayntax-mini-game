import type { FC } from "react";

interface GuideGroup {
  id: string;
  badge: string;
  title: string;
  icon: string;
  bgColor: string;
  commands: Array<{ text: string; note: string }>;
  whenToUse: string;
  systemAction: string;
  nextStep: string;
}

const GUIDE_GROUPS: GuideGroup[] = [
  {
    id: "navigation",
    badge: "Nhóm 1",
    title: "Điều hướng website",
    icon: "🌐",
    bgColor: "bg-[#fff6fb]",
    commands: [
      { text: "Học thử", note: "Mở danh sách bài học" },
      { text: "Trang chủ", note: "Về lại trang chủ" },
      { text: "Đăng nhập", note: "Mở trang đăng nhập" },
      { text: "Cuộn xuống", note: "Cuộn trang xuống 75%" },
      { text: "Cuộn lên", note: "Cuộn trang lên" },
      { text: "Quay lại", note: "Về trang trước đó" },
    ],
    whenToUse:
      "Dùng khi bạn muốn chuyển trang, khám phá nội dung bên dưới, hoặc quay lại trang trước mà không cần cuộn chuột hay bấm phím.",
    systemAction:
      "SAYNTAX tự động cuộn trang mượt mà hoặc chuyển hướng ngay lập tức. Phiên nghe của micro tiếp tục được duy trì xuyên suốt giữa các trang.",
    nextStep:
      "Sau khi trang chuyển hoặc màn hình cuộn tới nơi, bạn có thể nói tiếp câu lệnh tiếp theo ngay mà không cần kích hoạt lại micro.",
  },
  {
    id: "lesson-access",
    badge: "Nhóm 2",
    title: "Mở & tham gia bài học",
    icon: "📚",
    bgColor: "bg-[#fffdf0]",
    commands: [
      { text: "Bài 1", note: "Vào thẳng bài 1 (Tuần tự)" },
      { text: "Bài 2", note: "Vào bài 2 (In kết quả)" },
      { text: "Bài 3", note: "Vào bài 3 (Vòng lặp)" },
      { text: "Bài 4", note: "Vào bài 4 (Điều kiện)" },
      { text: "Bài 5", note: "Vào bài 5 (Biến số)" },
      { text: "Bắt đầu bài học", note: "Đóng popup lý thuyết để vào code" },
      { text: "Làm lại", note: "Đặt lại bài tập từ đầu" },
    ],
    whenToUse:
      "Dùng khi bạn muốn học một bài cụ thể, hoặc khi vừa mở bài và màn hình hiện cửa sổ kiến thức chuẩn bị (Primer modal).",
    systemAction:
      "SAYNTAX nạp không gian làm việc Blockly của bài học, thiết lập mục tiêu bài tập và thông báo trạng thái sẵn sàng qua giọng nói.",
    nextStep:
      "Nếu có popup kiến thức chuẩn bị, chỉ cần nói “Bắt đầu bài học” để vào thực hành. Sau đó lắng nghe giọng đọc hoặc nhìn ô nhiệm vụ góc trái.",
  },
  {
    id: "block-editing",
    badge: "Nhóm 3",
    title: "Tạo & chỉnh sửa khối lệnh",
    icon: "🧩",
    bgColor: "bg-[#e7fff3]",
    commands: [
      { text: "Thêm khối in", note: "Thêm khối in ra màn hình" },
      { text: "Thêm khối lặp 3 lần", note: "Thêm vòng lặp repeat" },
      { text: "Chọn khối 1", note: "Chọn khối theo số thứ tự" },
      { text: "Chèn sau khối 1", note: "Đổi vị trí con trỏ chèn" },
      { text: "Đổi chữ thành Xin chào", note: "Sửa văn bản trong khối" },
      { text: "Đổi số thành 5", note: "Sửa giá trị số" },
      { text: "Xóa khối này", note: "Xóa khối đang chọn" },
      { text: "Hoàn tác", note: "Khôi phục thao tác trước (Undo)" },
    ],
    whenToUse:
      "Dùng trong khu vực bài học để lập trình, ghép nối các khối thuật toán theo từng bước của nhiệm vụ.",
    systemAction:
      "SAYNTAX tạo khối lệnh tương ứng và ghép tự động vào vị trí con trỏ. Mỗi khối có huy hiệu số vàng ngoài lề trái ([1], [2], [2.1]) để bạn dễ gọi tên.",
    nextStep:
      "Quan sát khối xuất hiện trên màn hình. Nếu cần thay đổi giá trị, bạn nói “Đổi chữ thành...” hoặc “Đổi số thành...” mà không cần gõ phím.",
  },
  {
    id: "program-execution",
    badge: "Nhóm 4",
    title: "Chạy thử & xem kết quả",
    icon: "▶️",
    bgColor: "bg-[#f0f6ff]",
    commands: [
      { text: "Chạy chương trình", note: "Chạy và kiểm tra bài" },
      { text: "Chạy thử", note: "Xem chương trình in ra gì" },
      { text: "Kiểm tra bài", note: "Chấm điểm bước làm" },
    ],
    whenToUse:
      "Dùng sau khi bạn đã thêm hoặc chỉnh sửa xong các khối lệnh và muốn kiểm tra thuật toán của mình có chạy đúng đề bài không.",
    systemAction:
      "Trình thông dịch thực thi toàn bộ chuỗi khối lệnh, hiển thị kết quả ra màn hình Terminal phía dưới, phát âm thanh chấm điểm và đọc nhận xét.",
    nextStep:
      "Nếu chương trình đúng yêu cầu, bạn nói “Bước tiếp theo” để sang bước mới. Nếu chưa đúng, nghe lời nhắc để chỉnh sửa lại khối lệnh.",
  },
  {
    id: "hints-and-help",
    badge: "Nhóm 5",
    title: "Yêu cầu gợi ý & trợ giúp",
    icon: "💡",
    bgColor: "bg-[#fdf4ff]",
    commands: [
      { text: "Gợi ý", note: "Xin gợi ý cho bước hiện tại" },
      { text: "Bước tiếp theo", note: "Chuyển sang bước kế tiếp" },
      { text: "Bước trước", note: "Quay về bước trước đó" },
      { text: "Trợ giúp", note: "Cuộn tới bảng hướng dẫn này" },
    ],
    whenToUse:
      "Dùng khi bạn chưa rõ cần làm gì tiếp theo, muốn nhận gợi ý từng bước, hoặc muốn xem lại bảng câu lệnh đầy đủ.",
    systemAction:
      "Trong bài học, SAYNTAX cung cấp gợi ý chi tiết nêu rõ khối lệnh hoặc thông số cần nói tiếp. Trên website, nói “Trợ giúp” sẽ tự động cuộn đến phần này.",
    nextStep:
      "Lắng nghe hoặc đọc gợi ý hiển thị, sau đó nói câu lệnh mẫu được đề xuất trên giao diện.",
  },
  {
    id: "microphone-control",
    badge: "Nhóm 6",
    title: "Dừng micro & xử lý khi không hiểu",
    icon: "🛑",
    bgColor: "bg-[#fff1f2]",
    commands: [
      { text: "Dừng nghe", note: "Tắt micro tức thì" },
      { text: "Tắt micro", note: "Ngắt phiên nhận dạng" },
      { text: "Nói lại câu lệnh", note: "Khi hệ thống chưa nghe rõ" },
    ],
    whenToUse:
      "Dùng khi bạn muốn nghỉ ngơi, nói chuyện riêng tư, hoặc khi phát âm trong môi trường có tiếng ồn khiến hệ thống chưa nhận diện đúng.",
    systemAction:
      "Nói “Dừng nghe” sẽ ngắt micro ngay. Khi không hiểu câu lệnh, SAYNTAX hiển thị cảnh báo hổ phách và giữ micro tiếp tục mở để bạn nói lại.",
    nextStep:
      "Nếu hệ thống chưa hiểu, bạn chỉ cần nói lại câu lệnh với tốc độ vừa phải. Để bật lại micro sau khi đã tắt, người hỗ trợ nhấn nút “Bật micro”.",
  },
];

export const DetailedVoiceGuide: FC = () => {
  return (
    <section
      id="voice-guide"
      aria-label="Bảng hướng dẫn điều khiển giọng nói chi tiết"
      className="space-y-6 scroll-mt-6 rounded-3xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_#121212] sm:p-8"
    >
      {/* Header with Title, Badge, and Hands-Free Voice Tip */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-md border border-black bg-[#ffce47] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212]">
              Tầng 2 · Chi tiết
            </span>
            <span className="text-xs font-black uppercase text-zinc-600">
              Dành cho học viên & người hỗ trợ
            </span>
          </div>
          <h2 className="font-heading mt-2.5 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl">
            Bảng hướng dẫn điều khiển giọng nói đầy đủ
          </h2>
          <p className="mt-1 text-sm font-medium leading-relaxed text-zinc-700 max-w-2xl">
            Học viên hạn chế vận động tay có thể làm chủ toàn bộ SAYNTAX mà không cần người hỗ trợ can thiệp chuột sau bước thiết lập ban đầu.
          </p>
        </div>

        <div className="rounded-xl border-2 border-black bg-[#e7fff3] px-3.5 py-2 text-xs font-bold text-black shadow-[2px_2px_0_#121212]">
          🎙️ Nói <span className="font-mono font-black text-[#ff5f87]">&ldquo;Trợ giúp&rdquo;</span> bất kỳ lúc nào để quay lại bảng này
        </div>
      </div>

      {/* 6 Comprehensive Contextual Guidance Groups */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {GUIDE_GROUPS.map((group) => (
          <div
            key={group.id}
            className={`flex flex-col justify-between rounded-2xl border-2 border-black ${group.bgColor} p-4 sm:p-5 shadow-[3px_3px_0_#121212]`}
          >
            <div>
              {/* Group Title Row */}
              <div className="flex items-center justify-between gap-2 border-b border-black/15 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{group.icon}</span>
                  <h3 className="font-heading text-base font-black text-black">
                    {group.title}
                  </h3>
                </div>
                <span className="rounded border border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase text-black">
                  {group.badge}
                </span>
              </div>

              {/* Sample Utterance Badges */}
              <div className="mt-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
                  Câu lệnh nói (Ví dụ thực tế):
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {group.commands.map((cmd) => (
                    <span
                      key={cmd.text}
                      className="inline-flex items-center gap-1 rounded-md border border-black bg-white px-2 py-0.5 font-mono text-xs font-black text-black shadow-[1px_1px_0_#121212]"
                      title={cmd.note}
                    >
                      <span className="text-[#ff5f87]">🎤</span> &ldquo;{cmd.text}&rdquo;
                    </span>
                  ))}
                </div>
              </div>

              {/* Context: When to use */}
              <div className="mt-3 rounded-lg border border-black/10 bg-white/70 p-2.5 text-xs text-zinc-800">
                <strong className="font-black text-black">Khi nào dùng: </strong>
                {group.whenToUse}
              </div>

              {/* System Action */}
              <div className="mt-2 rounded-lg border border-black/10 bg-white/70 p-2.5 text-xs text-zinc-800">
                <strong className="font-black text-black">SAYNTAX sẽ làm gì: </strong>
                {group.systemAction}
              </div>
            </div>

            {/* Next Step */}
            <div className="mt-3 border-t border-black/10 pt-2.5 text-xs font-semibold text-emerald-950">
              👉 <strong className="font-black text-black">Bước tiếp theo: </strong>
              {group.nextStep}
            </div>
          </div>
        ))}
      </div>

      {/* Accessibility Guarantee Footer Note */}
      <div className="rounded-2xl border-2 border-black bg-[#fffdf0] p-4 text-xs font-medium text-zinc-800 shadow-[2px_2px_0_#121212]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong className="font-black uppercase tracking-wider text-black">
              Cam kết trợ năng (Accessibility Guarantee):
            </strong>
            <p className="mt-1 leading-relaxed">
              Mọi câu lệnh trên bảng này đều tương ứng với tính năng thật 100% của SAYNTAX. Khi micro mở, học sinh không phải ghi nhớ hết câu lệnh cùng một lúc mà luôn có gợi ý câu mẫu ngay trên từng bước học.
            </p>
          </div>
          <a
            href="#voice-activation"
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-black bg-[#ff5f87] px-3.5 py-2 text-xs font-black uppercase text-black shadow-[2px_2px_0_#121212] hover:-translate-y-0.5 transition-transform shrink-0 focus-visible:outline-4 focus-visible:outline-[#0052cc]"
          >
            Bật micro ở góc màn hình 🎙️
          </a>
        </div>
      </div>
    </section>
  );
};
