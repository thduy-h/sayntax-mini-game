import type { Metadata } from "next";
import Link from "next/link";
import { listSeedV2Lessons } from "@shecancode/lesson-engine";
import { BrandLogo } from "@/components/brand-logo";
import { FirstTimeGuidance } from "@/features/onboarding/components/first-time-guidance";

const lessons = listSeedV2Lessons();
const totalSteps = lessons.reduce((sum, lesson) => sum + lesson.stepCount, 0);

export const metadata: Metadata = process.env.NEXT_PUBLIC_SITE_URL ? { alternates: { canonical: "/" } } : {};

const LESSON_BADGES = [
  "bg-[#ff5f87] text-white",
  "bg-[#ffce47] text-black",
  "bg-[#7df2c3] text-black",
  "bg-[#a8e6ff] text-black",
  "bg-[#d4b8ff] text-black",
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 sm:gap-10 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
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
            className="hidden sm:inline-flex rounded-xl border-2 border-transparent px-3 py-1.5 text-xs sm:text-sm font-bold text-zinc-700 hover:border-black/20"
            href="/voice-guide"
          >
            Hướng dẫn lệnh
          </Link>
          <Link
            className="hidden md:inline-flex rounded-xl border-2 border-transparent px-3 py-1.5 text-xs sm:text-sm font-bold text-zinc-700 hover:border-black/20"
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
        </div>
      </nav>

      {/* KHU VỰC 1 — HERO: BỐ CỤC HAI CỘT ỔN ĐỊNH */}
      <section
        aria-label="Giới thiệu nền tảng SAYNTAX"
        data-landing-hero
        className="grid gap-6 lg:grid-cols-2 items-stretch"
      >
        {/* Cột trái: Giới thiệu SAYNTAX, thông điệp sản phẩm và CTA chính */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-black bg-[#fff6fb] p-6 sm:p-7 shadow-[4px_4px_0_#121212]">
          <div className="space-y-3.5">
            <span className="inline-block rounded-md border border-black bg-[#ffce47] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[1.5px_1.5px_0_#121212]">
              Học lập trình không rào cản
            </span>

            <h1 className="font-heading text-3xl sm:text-4xl lg:text-[2.65rem] font-black leading-[1.15] text-black tracking-tight">
              Học lập trình bằng giọng nói tiếng Việt.
            </h1>

            <p className="text-base sm:text-lg font-medium leading-relaxed text-zinc-800">
              SAYNTAX giúp người mới học lập trình bằng giọng nói hoặc kéo thả khối lệnh.
            </p>

            {/* Primary & Secondary CTAs close to introduction */}
            <div className="pt-1 flex flex-wrap items-center gap-3">
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
                Xem hướng dẫn
              </Link>
            </div>

            {/* Clear Voice Prompt & Mouse note */}
            <div className="pt-1 text-xs sm:text-sm font-semibold text-zinc-800">
              🎙️ Hãy nói <span className="font-mono font-black text-black bg-white px-2 py-0.5 rounded-md border border-black shadow-[1px_1px_0_#121212]">&ldquo;Học thử&rdquo;</span> để bắt đầu.
              <span className="block mt-1 text-[11px] sm:text-xs font-medium text-zinc-600">
                (Nút bấm dành cho người có thể sử dụng chuột, không phải điều kiện bắt buộc đối với người học bằng giọng nói).
              </span>
            </div>
          </div>

          {/* Hands-Free Guarantee & Reassurance */}
          <div className="mt-5 space-y-2.5 border-t border-black/10 pt-4">
            <div className="rounded-xl border border-black/15 bg-white/70 p-2.5 text-xs sm:text-sm font-medium text-zinc-800 leading-snug">
              <strong className="font-black text-black">💡 Điều khiển rảnh tay: </strong>
              Người hỗ trợ bật micro ban đầu một lần. Sau đó, bạn có thể tự do điều khiển toàn bộ bằng giọng nói theo hướng dẫn từng bước.
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-zinc-700">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[#0e6245] font-black">✓</span> Không cần tài khoản
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[#0e6245] font-black">✓</span> Hoàn toàn bằng tiếng Việt
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[#0e6245] font-black">✓</span> Không cần cài đặt
              </span>
            </div>
          </div>
        </div>

        {/* Cột phải: Khu vực hướng dẫn luôn có mặt */}
        <FirstTimeGuidance />
      </section>

      {/* KHU VỰC 2 — HAI CÁCH HỌC */}
      <section aria-labelledby="learning-methods-title" className="space-y-4">
        <div>
          <h2 id="learning-methods-title" className="font-heading text-xl sm:text-2xl font-black uppercase tracking-tight text-black">
            Hai cách tạo chương trình
          </h2>
          <p className="text-sm font-medium text-zinc-600 mt-1">
            Linh hoạt lựa chọn phương thức phù hợp nhất với nhu cầu và khả năng vận động của bạn.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Method 1: Voice */}
          <div className="flex flex-col justify-between rounded-3xl border-2 border-black bg-[#fff6fb] p-6 shadow-[3px_3px_0_#121212]">
            <div>
              <div className="flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-black bg-[#ff5f87] text-2xl font-black text-white shadow-[2px_2px_0_#121212]">
                  🎙️
                </div>
                <div>
                  <h3 className="font-heading text-xl font-black text-black">Học bằng giọng nói</h3>
                  <p className="text-xs font-bold text-zinc-600">Tối ưu cho người hạn chế vận động tay</p>
                </div>
              </div>

              <p className="mt-3.5 text-base font-medium leading-relaxed text-zinc-800">
                Nói bằng tiếng Việt để tạo khối lệnh, nhập nội dung và kết nối các bước thuật toán.
                Hệ thống tự động nhận diện và ghép khối vào đúng vị trí — hoàn toàn không cần bàn phím hay chuột.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-black/10 text-xs font-bold text-zinc-700">
              Ví dụ: Nói <span className="font-mono font-black text-black">&ldquo;Thêm khối in&rdquo;</span> để tạo khối hiển thị văn bản.
            </div>
          </div>

          {/* Method 2: Drag and Drop */}
          <div className="flex flex-col justify-between rounded-3xl border-2 border-black bg-[#e7fff3] p-6 shadow-[3px_3px_0_#121212]">
            <div>
              <div className="flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-black bg-[#7df2c3] text-2xl font-black text-black shadow-[2px_2px_0_#121212]">
                  🧩
                </div>
                <div>
                  <h3 className="font-heading text-xl font-black text-black">Học bằng kéo thả Blockly</h3>
                  <p className="text-xs font-bold text-zinc-600">Trực quan · Không lo lỗi cú pháp</p>
                </div>
              </div>

              <p className="mt-3.5 text-base font-medium leading-relaxed text-zinc-800">
                Kéo các khối lệnh từ danh mục vào vùng làm việc và ghép nối như những mảnh ghép logo.
                Hình thành tư duy thuật toán logic, chính xác mà không bao giờ lo sai dấu chấm phẩy hay quy tắc gõ phức tạp.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-black/10 text-xs font-bold text-zinc-700">
              Thao tác: Kéo khối từ bảng → Thả vào vùng ghép → Bấm chạy chương trình.
            </div>
          </div>
        </div>
      </section>

      {/* KHU VỰC 3 — LỘ TRÌNH HỌC */}
      <section aria-labelledby="curriculum-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="curriculum-title" className="font-heading text-xl sm:text-2xl font-black uppercase tracking-tight text-black">
              Lộ trình 5 bài học cơ bản
            </h2>
            <p className="text-sm font-medium text-zinc-600 mt-1">
              Đi từng bước từ những chỉ dẫn tuần tự đầu tiên đến cấu trúc điều kiện và biến số ({totalSteps} bước thực hành).
            </p>
          </div>
          <Link
            className="text-xs sm:text-sm font-black uppercase text-black underline decoration-2 underline-offset-4 hover:text-[#ff5f87] transition-colors"
            href="/demo"
          >
            Vào học thử ngay →
          </Link>
        </div>

        {/* 5 Lesson Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {lessons.map((lesson, idx) => {
            const badgeStyle = LESSON_BADGES[idx % LESSON_BADGES.length];
            return (
              <Link
                key={lesson.id}
                href={`/demo/${lesson.slug}`}
                className="group flex flex-col justify-between rounded-2xl border-2 border-black bg-white p-4 shadow-[2.5px_2.5px_0_#121212] transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0_#121212] focus-visible:outline-4 focus-visible:outline-[#0052cc]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center justify-center rounded-md border border-black ${badgeStyle} px-2 py-0.5 text-xs font-black uppercase shadow-[1px_1px_0_#121212]`}>
                      Bài {lesson.orderIndex}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-500">
                      {lesson.stepCount} bước
                    </span>
                  </div>

                  <h3 className="font-heading mt-2.5 text-base font-black text-black group-hover:text-[#ff5f87] transition-colors leading-snug">
                    {lesson.title}
                  </h3>
                  <p className="mt-1.5 text-xs font-medium leading-relaxed text-zinc-600">
                    {lesson.summary}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-black/10 flex items-center justify-between text-xs font-black text-black uppercase">
                  <span>Học bài này</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Action Row & Reference to Dedicated Voice Guide */}
        <div className="rounded-2xl border-2 border-black bg-[#fffdf3] p-5 shadow-[3px_3px_0_#121212] flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-black text-black">
              Sẵn sàng bắt đầu với SAYNTAX?
            </p>
            <p className="text-xs font-medium text-zinc-600">
              Tra cứu bảng 7 nhóm câu lệnh giọng nói đầy đủ tại{" "}
              <Link href="/voice-guide" className="font-bold underline text-black hover:text-[#ff5f87]">
                Hướng dẫn câu lệnh
              </Link>{" "}
              (hoặc nói &ldquo;Trợ giúp&rdquo;).
            </p>
          </div>

          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-black bg-[#ffce47] px-5 py-2 text-sm font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-4 focus-visible:outline-[#0052cc]"
            href="/demo"
          >
            Bắt đầu bài 1 ngay →
          </Link>
        </div>
      </section>
    </main>
  );
}
