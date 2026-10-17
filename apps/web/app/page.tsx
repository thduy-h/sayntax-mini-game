import type { Metadata } from "next";
import Link from "next/link";
import { listSeedV2Lessons } from "@shecancode/lesson-engine";
import { BrandLogo } from "@/components/brand-logo";
import { VoiceBadge } from "@/features/voice-control/components/voice-badge";

const lessons = listSeedV2Lessons();
const totalSteps = lessons.reduce((sum, lesson) => sum + lesson.stepCount, 0);

export const metadata: Metadata = process.env.NEXT_PUBLIC_SITE_URL ? { alternates: { canonical: "/" } } : {};

const LESSON_COLORS = [
  "bg-[#ff5f87]",
  "bg-[#ffce47]",
  "bg-[#7df2c3]",
  "bg-[#a8e6ff]",
  "bg-[#d4b8ff]",
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[85dvh] w-full max-w-7xl flex-col gap-6 sm:gap-8 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Top Navigation Bar */}
      <nav
        aria-label="Điều hướng chính"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-black bg-white px-4 py-2.5 sm:px-6 sm:py-3 shadow-[3px_3px_0_#121212]"
      >
        <Link aria-label="SAYNTAX - Trang chủ" className="flex items-center" href="/">
          <BrandLogo className="w-[155px] sm:w-[175px]" priority />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            className="hidden md:inline-flex rounded-xl border-2 border-transparent px-3 py-1.5 text-xs sm:text-sm font-bold text-zinc-700 hover:border-black/20"
            href="/voice-guide"
          >
            Hướng dẫn lệnh
          </Link>
          <Link
            className="hidden sm:inline-flex rounded-xl border-2 border-transparent px-3 py-1.5 text-xs sm:text-sm font-bold text-zinc-700 hover:border-black/20"
            href="/privacy"
          >
            Riêng tư
          </Link>
          <Link
            className="inline-flex min-h-[42px] items-center rounded-xl border-2 border-black bg-[#fffdf3] px-3.5 py-1.5 text-xs sm:text-sm font-black uppercase text-black shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-4 focus-visible:outline-[#0052cc]"
            href="/sign-in"
          >
            Đăng nhập
          </Link>
          <Link
            className="inline-flex min-h-[42px] items-center rounded-xl border-2 border-black bg-[#ff5f87] px-4 py-1.5 text-xs sm:text-sm font-black uppercase tracking-wide text-black shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-4 focus-visible:outline-[#0052cc]"
            href="/demo"
          >
            Học thử ngay
          </Link>
        </div>
      </nav>

      {/* PHẦN 1 — GIỚI THIỆU (HERO) */}
      <section
        aria-label="Giới thiệu nền tảng SAYNTAX"
        className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr] items-stretch"
      >
        {/* Hero Left: Platform Identity, Subtitle & Primary Voice Prompt */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-black bg-[#fff6fb] p-5 sm:p-7 shadow-[4px_4px_0_#121212]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-black bg-[#ffce47] px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-black shadow-[1.5px_1.5px_0_#121212]">
                Không rào cản
              </span>
              <span className="rounded-md border border-black bg-white px-2.5 py-0.5 text-xs font-bold text-zinc-800 shadow-[1.5px_1.5px_0_#121212]">
                Dành cho người mới
              </span>
              <span className="rounded-md border border-black bg-[#e7fff3] px-2.5 py-0.5 text-xs font-bold text-zinc-800 shadow-[1.5px_1.5px_0_#121212]">
                Giọng nói &amp; Kéo thả
              </span>
            </div>

            <div className="space-y-2">
              <p className="font-heading text-xs font-black uppercase tracking-[0.16em] text-zinc-600">
                Nền tảng học lập trình bao trùm thế hệ mới
              </p>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-[2.6rem] font-black leading-[1.15] text-black tracking-tight">
                Học lập trình bằng giọng nói tiếng Việt.
              </h1>
              <p className="text-base sm:text-lg font-medium leading-relaxed text-zinc-800 pt-1">
                Tạo khối lệnh, rèn luyện tư duy thuật toán và viết chương trình đầu tiên bằng{" "}
                <strong className="font-bold text-[#b3003b]">tiếng Việt</strong> — bằng giọng nói hoặc
                kéo thả Blockly. Lập trình và điều khiển website không cần chuột hay bàn phím, mở ra cơ hội
                tiếp cận công nghệ cho tất cả mọi người.
              </p>
            </div>

            {/* Prominent Voice Suggestion Card */}
            <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_#121212] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#7df2c3] border border-black" />
                  Gợi ý câu lệnh để bắt đầu ngay:
                </span>
                <span className="text-[11px] font-bold text-zinc-500 hidden sm:inline">
                  Không cần bấm phím
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <VoiceBadge
                  command="Học thử"
                  actionHint="→ SAYNTAX sẽ mở danh sách bài học"
                  size="lg"
                  variant="yellow"
                />
              </div>

              <p className="text-xs font-medium text-zinc-600 leading-snug">
                Nói <span className="font-mono font-bold text-black">&ldquo;Trợ giúp&rdquo;</span> bất kỳ lúc nào để xem danh sách câu lệnh, hoặc nói{" "}
                <span className="font-mono font-bold text-black">&ldquo;Bài 1&rdquo;</span> để vào thẳng bài học đầu tiên.
              </p>
            </div>
          </div>

          {/* Mouse Primary CTAs & Guarantee */}
          <div className="mt-5 pt-4 border-t border-black/10 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-black bg-[#ff5f87] px-6 py-2.5 text-base sm:text-lg font-black text-black shadow-[3px_3px_0_#121212] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#121212] active:translate-y-0 focus-visible:outline-4 focus-visible:outline-[#0052cc]"
                href="/demo"
              >
                Học thử ngay — Miễn phí →
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-black bg-white px-5 py-2.5 text-sm sm:text-base font-black text-black shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-4 focus-visible:outline-[#0052cc]"
                href="/voice-guide"
              >
                Xem bảng câu lệnh
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-700">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[#0e6245] font-black">✓</span> Không cần tài khoản
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[#0e6245] font-black">✓</span> Hoàn toàn bằng tiếng Việt
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[#0e6245] font-black">✓</span> Không cần cài đặt phần mềm
              </span>
            </div>
          </div>
        </div>

        {/* Hero Right: Visual Illustration (Speech → Blockly Block → Program Outcome) */}
        <div
          aria-label="Minh họa cách SAYNTAX hoạt động: Lời nói thành khối lệnh và kết quả"
          className="flex flex-col justify-between rounded-3xl border-2 border-black bg-[#e7fff3] p-5 sm:p-6 shadow-[4px_4px_0_#121212]"
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 border-black bg-[#7df2c3] text-base shadow-[1.5px_1.5px_0_#121212]">
                  ⚡
                </span>
                <div>
                  <h2 className="font-heading text-base font-black text-black uppercase tracking-tight">
                    Cách SAYNTAX hoạt động
                  </h2>
                  <p className="text-[11px] font-bold text-zinc-600">
                    Minh họa: Lời nói → Khối lệnh → Kết quả
                  </p>
                </div>
              </div>
              <span className="rounded-md border border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1px_1px_0_#121212]">
                Trực quan
              </span>
            </div>

            {/* 3-Stage Visual Pipeline */}
            <div className="mt-3.5 space-y-2">
              {/* Stage 1: Spoken Words */}
              <div className="rounded-2xl border-2 border-black bg-white p-3 shadow-[2px_2px_0_#121212]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#ff5f87] text-[10px] font-black text-white">1</span>
                    Lời nói tiếng Việt
                  </span>
                  <span className="text-[10px] font-bold text-zinc-500">Giọng đọc tự nhiên</span>
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-black/20 bg-[#fff6fb] px-3 py-2">
                  <span className="text-lg">🎙️</span>
                  <strong className="font-mono text-sm sm:text-base font-black text-black">
                    &ldquo;In ra Xin chào&rdquo;
                  </strong>
                </div>
              </div>

              {/* Connector 1 */}
              <div className="flex items-center justify-center gap-1.5 py-0.5">
                <div className="h-2 w-0.5 bg-black/30" />
                <span className="rounded-full border border-black bg-[#ffce47] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_#121212]">
                  Ghép khối tự động ↓
                </span>
                <div className="h-2 w-0.5 bg-black/30" />
              </div>

              {/* Stage 2: Blockly Blocks */}
              <div className="rounded-2xl border-2 border-black bg-[#fffdf0] p-3 shadow-[2px_2px_0_#121212]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#ffce47] text-[10px] font-black text-black">2</span>
                    Khối lệnh Blockly
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800">Không lỗi cú pháp</span>
                </div>

                {/* Neo-brutalist visual block stack */}
                <div className="mt-2 space-y-1 font-mono text-xs font-black">
                  {/* Block 1: Start */}
                  <div className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-[#ffce47] px-2.5 py-1 text-black shadow-[1.5px_1.5px_0_#121212]">
                    <span className="rounded bg-white/80 border border-black/30 px-1 text-[10px] font-black">1</span>
                    <span>▶ khi bắt đầu</span>
                  </div>

                  {/* Block 2: Print (Nested inside Start) */}
                  <div className="flex items-center gap-1.5 pl-4">
                    <div className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-[#ff5f87] px-2.5 py-1 text-white shadow-[1.5px_1.5px_0_#121212]">
                      <span className="rounded bg-white/20 border border-white/40 px-1 text-[10px] font-black text-white">2</span>
                      <span>in ra</span>
                      <span className="rounded border border-black bg-white px-1.5 py-0.5 text-black">
                        &ldquo;Xin chào!&rdquo;
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connector 2 */}
              <div className="flex items-center justify-center gap-1.5 py-0.5">
                <div className="h-2 w-0.5 bg-black/30" />
                <span className="rounded-full border border-black bg-[#7df2c3] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_#121212]">
                  Thực thi chương trình ↓
                </span>
                <div className="h-2 w-0.5 bg-black/30" />
              </div>

              {/* Stage 3: Program Outcome (Terminal) */}
              <div className="rounded-2xl border-2 border-black bg-[#121212] p-3 text-white shadow-[2px_2px_0_#121212]">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#ff5f87]" />
                    <span className="h-2 w-2 rounded-full bg-[#ffce47]" />
                    <span className="h-2 w-2 rounded-full bg-[#7df2c3]" />
                    <span className="ml-1 text-[10px] font-mono font-bold text-zinc-400">
                      Màn hình kết quả
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#7df2c3]">Đã chạy</span>
                </div>
                <div className="mt-2 font-mono text-xs">
                  <p className="text-[#7df2c3] text-sm font-black">&gt; Xin chào!</p>
                  <p className="mt-0.5 text-[10px] text-zinc-400">✓ Chương trình chạy chính xác theo yêu cầu</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hands-Free Guarantee Note */}
          <div className="mt-3.5 rounded-2xl border-2 border-black bg-[#fffdf3] p-3 text-xs font-medium text-zinc-800 shadow-[2px_2px_0_#121212]">
            <strong className="font-black text-black flex items-center gap-1.5 uppercase tracking-wide">
              <span>💡</span> Điều khiển không cần chuột:
            </strong>
            <p className="mt-0.5 leading-relaxed text-zinc-700">
              Người hỗ trợ bật micro ban đầu một lần duy nhất. Sau đó, học sinh nói câu lệnh để tự tạo khối, chạy thử và hoàn thành bài tập độc lập.
            </p>
          </div>
        </div>
      </section>

      {/* PHẦN 2 — HAI CÁCH TẠO CHƯƠNG TRÌNH */}
      <section aria-labelledby="learning-methods-title" className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="rounded-md border border-black bg-[#ffce47] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212]">
            Cách học
          </span>
          <h2 id="learning-methods-title" className="font-heading text-xl sm:text-2xl font-black uppercase tracking-tight text-black">
            Hai cách tạo chương trình linh hoạt
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Voice Mode */}
          <div className="flex flex-col justify-between rounded-3xl border-2 border-black bg-[#fff6fb] p-6 shadow-[4px_4px_0_#121212]">
            <div>
              <div className="flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-black bg-[#ff5f87] text-2xl font-black text-white shadow-[2px_2px_0_#121212]">
                  🎙️
                </div>
                <div>
                  <h3 className="font-heading text-xl font-black text-black">Học bằng giọng nói</h3>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    Tối ưu cho người hạn chế vận động tay
                  </p>
                </div>
              </div>

              <p className="mt-4 text-base font-medium leading-relaxed text-zinc-800">
                Nói bằng tiếng Việt để tạo, ghép và chỉnh sửa khối lệnh. Hệ thống nhận diện lệnh tức thì,
                tự động gắn khối vào đúng vị trí thuật toán — hoàn toàn không cần gõ phím hay dùng chuột.
              </p>

              <div className="mt-4 pt-3 border-t border-black/10">
                <p className="text-xs font-black uppercase tracking-wider text-zinc-600 mb-2">
                  Ví dụ câu lệnh:
                </p>
                <VoiceBadge command="Thêm khối in" actionHint="→ Khối In xuất hiện trên màn hình" size="md" variant="white" />
              </div>
            </div>

            <div className="mt-4 text-xs font-semibold text-zinc-600">
              💡 Mỗi khối có huy hiệu số để bạn dễ gọi tên: &ldquo;Chọn khối 1&rdquo;, &ldquo;Đổi chữ thành Xin chào&rdquo;.
            </div>
          </div>

          {/* Blockly Drag and Drop Mode */}
          <div className="flex flex-col justify-between rounded-3xl border-2 border-black bg-[#e7fff3] p-6 shadow-[4px_4px_0_#121212]">
            <div>
              <div className="flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-black bg-[#7df2c3] text-2xl font-black text-black shadow-[2px_2px_0_#121212]">
                  🧩
                </div>
                <div>
                  <h3 className="font-heading text-xl font-black text-black">Học bằng kéo thả Blockly</h3>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    Trực quan · Không lo lỗi cú pháp
                  </p>
                </div>
              </div>

              <p className="mt-4 text-base font-medium leading-relaxed text-zinc-800">
                Kéo các khối lệnh từ danh mục vào không gian làm việc và ghép nối chúng như những mảnh ghép logo.
                Xây dựng tư duy thuật toán trực quan, không cần lo dấu chấm phẩy hay quy tắc gõ phức tạp.
              </p>

              <div className="mt-4 pt-3 border-t border-black/10">
                <p className="text-xs font-black uppercase tracking-wider text-zinc-600 mb-2">
                  Quy trình kéo thả:
                </p>
                <div className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-white px-3 py-2 text-sm font-bold text-zinc-800 shadow-[2px_2px_0_#121212]">
                  <span>🧩 Kéo khối lệnh</span>
                  <span>→</span>
                  <span>Thả vào vùng ghép</span>
                  <span>→</span>
                  <span className="font-black text-emerald-800">Chạy chương trình</span>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs font-semibold text-zinc-600">
              💡 Hoạt động ổn định trên mọi thiết bị và không yêu cầu quyền microphone.
            </div>
          </div>
        </div>
      </section>

      {/* PHẦN 3 — HÀNH TRÌNH 3 BƯỚC CHO NGƯỜI MỚI */}
      <section aria-labelledby="journey-title" className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="rounded-md border border-black bg-[#ffce47] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212]">
            Quy trình
          </span>
          <h2 id="journey-title" className="font-heading text-xl sm:text-2xl font-black uppercase tracking-tight text-black">
            Làm quen với lập trình chỉ trong 3 bước
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {/* Step 1 */}
          <div className="flex flex-col justify-between rounded-3xl border-2 border-black bg-[#fffdf0] p-5 sm:p-6 shadow-[3px_3px_0_#121212]">
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 border-black bg-[#ff5f87] text-sm font-black text-white shadow-[1px_1px_0_#121212]">
                  1
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-zinc-500">Bước một</span>
              </div>
              <h3 className="font-heading mt-3 text-lg font-black text-black">Chọn bài học</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-700">
                Mở danh sách bài học và chọn bài bạn muốn thử sức. Bài 1 bắt đầu với các chỉ dẫn tuần tự cơ bản.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/10">
              <VoiceBadge command="Học thử" actionHint="rồi nói “Bài 1”" size="sm" variant="white" />
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col justify-between rounded-3xl border-2 border-black bg-[#fff6fb] p-5 sm:p-6 shadow-[3px_3px_0_#121212]">
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 border-black bg-[#ffce47] text-sm font-black text-black shadow-[1px_1px_0_#121212]">
                  2
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-zinc-500">Bước hai</span>
              </div>
              <h3 className="font-heading mt-3 text-lg font-black text-black">Tạo khối lệnh</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-700">
                Làm theo hướng dẫn trên màn hình. Nói câu lệnh mẫu được gợi ý để thêm, sửa và kết nối các khối thuật toán.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/10">
              <VoiceBadge command="Thêm khối in" actionHint="hoặc kéo khối từ bảng" size="sm" variant="white" />
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col justify-between rounded-3xl border-2 border-black bg-[#e7fff3] p-5 sm:p-6 shadow-[3px_3px_0_#121212]">
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 border-black bg-[#7df2c3] text-sm font-black text-black shadow-[1px_1px_0_#121212]">
                  3
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-zinc-500">Bước ba</span>
              </div>
              <h3 className="font-heading mt-3 text-lg font-black text-black">Chạy &amp; Xem kết quả</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-700">
                Máy tính thực thi từng bước trong chương trình và hiển thị kết quả ngay trên màn hình để bạn kiểm tra.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/10">
              <VoiceBadge command="Chạy chương trình" actionHint="để kiểm tra bài" size="sm" variant="white" />
            </div>
          </div>
        </div>
      </section>

      {/* PHẦN 4 — LỘ TRÌNH 5 BÀI HỌC CỐT LÕI */}
      <section aria-labelledby="curriculum-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-md border border-black bg-[#ff8a65] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212]">
              Giáo trình
            </span>
            <h2 id="curriculum-title" className="font-heading text-xl sm:text-2xl font-black uppercase tracking-tight text-black">
              Lộ trình 5 bài học cốt lõi
            </h2>
          </div>
          <Link
            className="text-xs sm:text-sm font-black uppercase text-black underline decoration-2 underline-offset-4 hover:text-[#ff5f87] transition-colors"
            href="/demo"
          >
            Vào trang trải nghiệm ({totalSteps} bước thực hành) →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson, idx) => {
            const badgeColor = LESSON_COLORS[idx % LESSON_COLORS.length];
            return (
              <Link
                key={lesson.id}
                href={`/demo/${lesson.slug}`}
                title={`Bài ${lesson.orderIndex}: ${lesson.title} - Nói "Bài ${lesson.orderIndex}"`}
                className="group flex flex-col justify-between rounded-3xl border-2 border-black bg-white p-5 shadow-[3px_3px_0_#121212] transition-all hover:-translate-y-1 hover:shadow-[5px_5px_0_#121212] focus-visible:outline-4 focus-visible:outline-[#0052cc]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border border-black ${badgeColor} px-2 py-0.5 text-xs font-black uppercase text-black shadow-[1px_1px_0_#121212]`}
                    >
                      <span>Bài {lesson.orderIndex}</span>
                    </span>
                    <span className="text-xs font-bold text-zinc-500">
                      {lesson.stepCount} bước học
                    </span>
                  </div>

                  <h3 className="font-heading mt-3 text-lg font-black text-black group-hover:text-[#ff5f87] transition-colors">
                    {lesson.title}
                  </h3>
                  <p className="mt-1.5 text-sm font-medium leading-relaxed text-zinc-700">
                    {lesson.summary}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-3 text-xs">
                  <span className="font-mono font-bold text-zinc-600 bg-[#fffdf0] px-2 py-1 rounded border border-black/15">
                    🎙️ &ldquo;Bài {lesson.orderIndex}&rdquo;
                  </span>
                  <span className="inline-flex items-center gap-1 font-black text-black uppercase group-hover:translate-x-0.5 transition-transform">
                    Bắt đầu →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* PHẦN 5 — LIÊN KẾT TỚI BẢNG HƯỚNG DẪN LỆNH CHI TIẾT */}
      <section
        aria-label="Khám phá bảng hướng dẫn chi tiết"
        className="rounded-3xl border-2 border-black bg-[#fffdf3] p-5 sm:p-7 shadow-[4px_4px_0_#121212]"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-black bg-[#ffce47] px-2 py-0.5 text-xs font-black uppercase tracking-wider text-black shadow-[1px_1px_0_#121212]">
                Tài liệu &amp; Bảng lệnh
              </span>
              <span className="text-xs font-bold text-zinc-600">
                6 nhóm câu lệnh đầy đủ
              </span>
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-black text-black">
              Bạn muốn xem danh sách toàn bộ câu lệnh?
            </h2>
            <p className="text-sm sm:text-base font-medium leading-relaxed text-zinc-700">
              Tra cứu hướng dẫn đầy đủ bao gồm: điều hướng website, mở bài học, tạo và chỉnh sửa khối lệnh,
              chạy chương trình, xin gợi ý và điều khiển micro.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <VoiceBadge command="Trợ giúp" actionHint="để mở ngay" size="md" variant="white" />
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-black bg-[#ffce47] px-5 py-2 text-sm font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-4 focus-visible:outline-[#0052cc]"
              href="/voice-guide"
            >
              Xem bảng hướng dẫn chi tiết →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
