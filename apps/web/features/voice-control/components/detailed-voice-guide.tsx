import type { FC } from "react";

interface GuideGroup {
  id: string;
  badge: string;
  title: string;
  icon: string;
  bgColor: string;
  purpose: string;
  whenToUse: string;
  commands: Array<{ text: string; note: string }>;
  expectedResult: string;
}

const GUIDE_GROUPS: GuideGroup[] = [
  {
    id: "navigation",
    badge: "Nhóm 1",
    title: "Điều hướng website",
    icon: "🌐",
    bgColor: "bg-[#fff6fb]",
    purpose:
      "Di chuyển giữa các trang, cuộn trang lên xuống và quay lại trang trước hoàn toàn bằng giọng nói.",
    whenToUse:
      "Dùng khi bạn muốn chuyển trang, khám phá nội dung bên dưới, hoặc quay lại trang trước mà không cần cuộn chuột hay bấm phím.",
    commands: [
      { text: "Cuộn xuống", note: "Cuộn trang xuống để đọc tiếp" },
      { text: "Lên đầu trang", note: "Cuộn về đỉnh trang" },
      { text: "Cuộn lên", note: "Cuộn trang lên" },
      { text: "Quay lại", note: "Trở về trang vừa xem" },
      { text: "Học thử", note: "Mở danh sách bài học" },
      { text: "Trang chủ", note: "Về lại trang chủ" },
    ],
    expectedResult:
      "SAYNTAX tự động cuộn trang mượt mà hoặc chuyển hướng tức thì; phiên thu âm của micro tiếp tục được duy trì xuyên suốt.",
  },
  {
    id: "global-voice",
    badge: "Nhóm 2",
    title: "Sử dụng Global Voice",
    icon: "🎙️",
    bgColor: "bg-[#fffdf0]",
    purpose:
      "Kiểm soát hoạt động của micro và theo dõi phản hồi nhận lệnh trên thanh điều khiển toàn cục ở góc phải dưới màn hình.",
    whenToUse:
      "Dùng khi muốn biết hệ thống có đang nghe không, kiểm tra câu vừa nhận, tạm dừng micro khi nghỉ ngơi hoặc xem bảng hướng dẫn.",
    commands: [
      { text: "Dừng nghe", note: "Tạm dừng nhận diện giọng nói" },
      { text: "Tắt micro", note: "Ngắt kết nối thu âm" },
      { text: "Trợ giúp", note: "Mở bảng hướng dẫn câu lệnh này" },
    ],
    expectedResult:
      "Thanh giọng nói phản hồi rõ: Đang nghe (xanh) → Đang xử lý (xanh dương) → Đã nghe được gì → Kết quả hoàn thành (✓ kèm thông báo).",
  },
  {
    id: "lesson-access",
    badge: "Nhóm 3",
    title: "Mở & chọn bài học",
    icon: "📚",
    bgColor: "bg-[#e7fff3]",
    purpose:
      "Truy cập trực tiếp từng bài học trong lộ trình 5 bài và đóng cửa sổ kiến thức chuẩn bị để bắt đầu làm bài.",
    whenToUse:
      "Dùng khi ở trang danh sách bài học hoặc muốn vào thẳng một bài từ bất cứ đâu trên website.",
    commands: [
      { text: "Bài 1", note: "Vào bài 1: Bắt đầu & Tuần tự" },
      { text: "Bài 2", note: "Vào bài 2: In kết quả" },
      { text: "Bài 3", note: "Vào bài 3: Vòng lặp" },
      { text: "Bài 4", note: "Vào bài 4: Điều kiện" },
      { text: "Bài 5", note: "Vào bài 5: Biến số" },
      { text: "Bắt đầu bài học", note: "Đóng bảng lý thuyết để code" },
      { text: "Làm lại", note: "Đặt lại bài tập từ đầu" },
    ],
    expectedResult:
      "SAYNTAX nạp bài học tương ứng, mở vùng làm việc Blockly và thiết lập mục tiêu bài tập sẵn sàng cho bạn thực hành.",
  },
  {
    id: "blockly-interaction",
    badge: "Nhóm 4",
    title: "Tương tác với Blockly",
    icon: "🎯",
    bgColor: "bg-[#f0f6ff]",
    purpose:
      "Định vị, chọn khối lệnh cụ thể và đổi vị trí con trỏ chèn trên vùng làm việc Blockly mà không cần dùng chuột.",
    whenToUse:
      "Dùng khi bài học có nhiều khối lệnh và bạn muốn chỉ định vị trí cần thêm hoặc chỉnh sửa khối tiếp theo.",
    commands: [
      { text: "Chọn khối 1", note: "Chọn khối theo số thứ tự" },
      { text: "Chọn khối 2", note: "Chọn khối thứ 2" },
      { text: "Chèn sau khối 1", note: "Đổi vị trí con trỏ chèn" },
      { text: "Chèn sau khối 2", note: "Đổi vị trí con trỏ chèn" },
    ],
    expectedResult:
      "Khối lệnh tương ứng được viền sáng nổi bật (focus), con trỏ chèn chuyển đến vị trí bạn vừa chỉ định.",
  },
  {
    id: "block-editing",
    badge: "Nhóm 5",
    title: "Tạo, sửa & nối khối lệnh",
    icon: "🧩",
    bgColor: "bg-[#fdf4ff]",
    purpose:
      "Sinh khối lệnh mới, thay đổi nội dung chữ hoặc số bên trong khối, xóa khối và khôi phục thao tác trước.",
    whenToUse:
      "Dùng trong khu vực bài học để lập trình, ghép nối các khối thuật toán theo từng bước yêu cầu của nhiệm vụ.",
    commands: [
      { text: "Thêm khối in", note: "Thêm khối hiển thị văn bản" },
      { text: "Thêm khối lặp 3 lần", note: "Thêm vòng lặp repeat" },
      { text: "Đổi chữ thành Xin chào", note: "Sửa văn bản trong khối" },
      { text: "Đổi số thành 5", note: "Sửa giá trị số" },
      { text: "Xóa khối này", note: "Xóa khối đang chọn" },
      { text: "Hoàn tác", note: "Khôi phục thao tác trước (Undo)" },
    ],
    expectedResult:
      "Khối lệnh tự động sinh ra và kết nối vào đúng ngàm của khối trước; nội dung chữ hoặc số được cập nhật tức thì.",
  },
  {
    id: "program-execution",
    badge: "Nhóm 6",
    title: "Chạy chương trình & xem kết quả",
    icon: "▶️",
    bgColor: "bg-[#fff8e7]",
    purpose:
      "Thực thi chuỗi khối lệnh đã lắp ráp, quan sát kết quả đầu ra và kiểm tra độ chính xác theo đề bài.",
    whenToUse:
      "Dùng sau khi bạn đã thêm hoặc sửa xong các khối lệnh và muốn kiểm tra thuật toán của mình có chạy đúng không.",
    commands: [
      { text: "Chạy chương trình", note: "Chạy và chấm điểm bài" },
      { text: "Chạy thử", note: "Xem chương trình in ra gì" },
      { text: "Kiểm tra bài", note: "Đối chiếu với mục tiêu bài tập" },
    ],
    expectedResult:
      "Trình thông dịch chạy các khối lệnh từ trên xuống dưới, in kết quả ra màn hình Terminal và thông báo kết quả chấm điểm.",
  },
  {
    id: "hints-and-recovery",
    badge: "Nhóm 7",
    title: "Gợi ý, trợ giúp & xử lý lỗi",
    icon: "💡",
    bgColor: "bg-[#fff1f2]",
    purpose:
      "Nhận gợi ý khi bị kẹt, điều hướng các bước học và xử lý khi phát âm chưa được hệ thống nhận diện đúng.",
    whenToUse:
      "Dùng khi chưa rõ cần làm gì tiếp theo, muốn quay lại bước trước, hoặc khi hệ thống thông báo chưa hiểu câu lệnh.",
    commands: [
      { text: "Gợi ý", note: "Xin gợi ý cho bước hiện tại" },
      { text: "Bước tiếp theo", note: "Sang bước mới khi hoàn thành" },
      { text: "Bước trước", note: "Quay về bước trước đó" },
      { text: "Trợ giúp", note: "Mở bảng hướng dẫn câu lệnh" },
    ],
    expectedResult:
      "SAYNTAX đọc to lời gợi ý cụ thể hoặc mở bảng hướng dẫn; micro vẫn tiếp tục lắng nghe để bạn dễ dàng nói lại.",
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
            Học viên có thể điều khiển toàn bộ website và bài học SAYNTAX bằng giọng nói mà không cần dùng chuột sau bước bật micro ban đầu.
          </p>
        </div>

        <div className="rounded-xl border-2 border-black bg-[#e7fff3] px-3.5 py-2 text-xs font-bold text-black shadow-[2px_2px_0_#121212]">
          🎙️ Nói <span className="font-mono font-black text-[#ff5f87]">&ldquo;Trợ giúp&rdquo;</span> bất kỳ lúc nào để quay lại bảng này
        </div>
      </div>

      {/* 7 Comprehensive Progressive Guidance Groups */}
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

              {/* Purpose */}
              <p className="mt-2.5 text-xs font-medium leading-relaxed text-zinc-800">
                <strong className="font-black text-black">Công dụng: </strong>
                {group.purpose}
              </p>

              {/* Sample Utterance Badges */}
              <div className="mt-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
                  Ví dụ khẩu lệnh:
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

              {/* When to use */}
              <div className="mt-3 rounded-lg border border-black/10 bg-white/70 p-2.5 text-xs text-zinc-800">
                <strong className="font-black text-black">Khi nào dùng: </strong>
                {group.whenToUse}
              </div>
            </div>

            {/* Expected Result */}
            <div className="mt-3 border-t border-black/10 pt-2.5 text-xs font-semibold text-emerald-950">
              👉 <strong className="font-black text-black">Kết quả mong đợi: </strong>
              {group.expectedResult}
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
