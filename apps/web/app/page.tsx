import type { Metadata } from "next";
import Link from "next/link";
import { listSeedV2Lessons } from "@shecancode/lesson-engine";
import { BrandLogo } from "@/components/brand-logo";
import { HeroVoiceTrigger } from "@/features/voice-control/components/hero-voice-trigger";
import { DetailedVoiceGuide } from "@/features/voice-control/components/detailed-voice-guide";

const lessons = listSeedV2Lessons();
const totalSteps = lessons.reduce((sum, lesson) => sum + lesson.stepCount, 0);

export const metadata: Metadata = process.env.NEXT_PUBLIC_SITE_URL ? { alternates: { canonical: "/" } } : {};

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[85dvh] w-full max-w-7xl flex-col gap-10 px-4 py-6 sm:px-8 lg:px-12">
      {/* Top Navigation Bar */}
      <nav className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-black bg-white px-5 py-3.5 shadow-[4px_4px_0_#121212]">
        <Link aria-label="SAYNTAX - Trang chủ" className="flex items-center" href="/">
          <BrandLogo className="w-[170px] sm:w-[190px]" priority />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            className="hidden sm:inline-flex rounded-lg border-2 border-transparent px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-700 hover:border-black/20"
            href="/privacy"
          >
            Riêng tư
          </Link>
          <Link
            className="inline-flex items-center rounded-xl border-2 border-black bg-[#fffdf3] px-3.5 py-2 text-xs font-black uppercase text-black shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            href="/sign-in"
          >
            Đăng nhập
          </Link>
          <Link
            className="inline-flex items-center rounded-xl border-2 border-black bg-[#ff5f87] px-4 py-2 text-xs font-black uppercase tracking-wide text-black shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            href="/demo"
          >
            Học thử ngay
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col justify-between rounded-3xl border-2 border-black bg-[#fff6fb] p-6 shadow-[5px_5px_0_#121212] sm:p-10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-black bg-[#ffce47] px-3 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212]">
                Không rào cản
              </span>
              <span className="rounded-md border border-black bg-white px-3 py-1 text-xs font-bold text-zinc-800 shadow-[2px_2px_0_#121212]">
                Dành cho người mới
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <p className="font-heading text-xs font-black uppercase tracking-[0.16em] text-zinc-600">
                Nền tảng học lập trình thế hệ mới
              </p>
              <h1 className="font-heading max-w-2xl text-3xl font-black leading-tight text-black sm:text-4xl lg:text-5xl">
                Học lập trình bằng giọng nói tiếng Việt.
              </h1>
              <p className="max-w-xl text-base font-medium leading-relaxed text-zinc-800 sm:text-lg">
                Tạo khối lệnh, xây dựng tư duy thuật toán và viết chương trình đầu tiên bằng tiếng Việt — bằng giọng nói hoặc kéo thả Blockly. Không cần kinh nghiệm trước đó.
              </p>
            </div>

            <HeroVoiceTrigger />
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-black bg-[#ff5f87] px-6 py-3 text-base font-black text-black shadow-[4px_4px_0_#121212] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#121212] active:translate-y-0"
                href="/demo"
              >
                Học thử ngay — Miễn phí →
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-black bg-white px-5 py-3 text-sm font-black text-black shadow-[3px_3px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0"
                href="/sign-up"
              >
                Tạo tài khoản
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-700">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[#0e6245]">✓</span> Không cần tài khoản để thử
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[#0e6245]">✓</span> Hoàn toàn bằng tiếng Việt
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[#0e6245]">✓</span> Không cần cài đặt
              </span>
            </div>
          </div>
        </div>

        {/* Hero Right: 5-Lesson Visual Curriculum Roadmap */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-black bg-[#e7fff3] p-5 shadow-[5px_5px_0_#121212] sm:p-7">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md border border-black bg-white px-2.5 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212]">
                Lộ trình 5 bài học
              </span>
              <span className="text-xs font-black uppercase text-zinc-600">
                {lessons.length} bài · {totalSteps} bước
              </span>
            </div>
            <h2 className="font-heading mt-3 text-xl font-black leading-snug sm:text-2xl text-black">
              Nói tên bài để bắt đầu ngay
            </h2>
            <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-700">
              Người học có thể nói trực tiếp tên bài để vào học ngay mà không cần chạm chuột:
            </p>

            {/* 5-Lesson Interactive Visual Progression */}
            <div className="mt-4 space-y-2">
              {lessons.map((lesson, idx) => {
                const colors = [
                  "bg-[#ff5f87]",
                  "bg-[#ffce47]",
                  "bg-[#7df2c3]",
                  "bg-[#a8e6ff]",
                  "bg-[#d4b8ff]",
                ];
                const badgeColor = colors[idx % colors.length];
                return (
                  <Link
                    key={lesson.id}
                    href={`/demo/${lesson.slug}`}
                    className="group flex items-center justify-between rounded-xl border-2 border-black bg-white p-2.5 text-xs font-bold shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#121212]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-black ${badgeColor} text-[11px] font-black text-black shadow-[1px_1px_0_#121212]`}
                      >
                        {lesson.orderIndex}
                      </span>
                      <div className="min-w-0 truncate">
                        <span className="font-black text-black group-hover:text-[#ff5f87]">
                          {lesson.title}
                        </span>
                        <span className="ml-2 hidden text-[11px] font-medium text-zinc-500 xl:inline truncate">
                          · {lesson.stepCount} bước
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[10px] font-bold text-zinc-600 bg-[#fffdf0] px-1.5 py-0.5 rounded border border-black/15">
                        Nói &ldquo;Bài {lesson.orderIndex}&rdquo;
                      </span>
                      <span className="text-[11px] font-black uppercase text-zinc-400 group-hover:text-black">
                        →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t-2 border-black/10 flex flex-wrap items-center justify-between gap-2">
            <Link
              className="inline-flex flex-1 items-center justify-center rounded-xl border-2 border-black bg-[#ffce47] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-[3px_3px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0"
              href="/demo"
            >
              Xem toàn bộ giáo trình →
            </Link>
            <a
              href="#voice-guide"
              className="inline-flex items-center justify-center rounded-xl border-2 border-black bg-white px-3 py-2.5 text-xs font-bold text-black shadow-[2px_2px_0_#121212] hover:bg-zinc-50 transition-transform hover:-translate-y-0.5"
            >
              Bảng lệnh chi tiết ↓
            </a>
          </div>
        </div>
      </section>

      {/* How To Learn Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="rounded-md border border-black bg-[#ffce47] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212]">
            Cách học
          </span>
          <h2 className="font-heading text-xl font-black uppercase tracking-tight text-black sm:text-2xl">
            Hai cách tạo chương trình
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-black bg-[#fff6fb] p-5 shadow-[4px_4px_0_#121212]">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-black bg-[#ff5f87] text-lg font-black text-white shadow-[2px_2px_0_#121212]">
              🎙️
            </div>
            <h3 className="font-heading mt-3 text-lg font-black text-black">Học bằng giọng nói</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-700">
              Nói bằng tiếng Việt để tạo và chỉnh sửa chương trình. Hệ thống nhận diện lệnh tức thì và ghép khối vào đúng vị trí — không cần gõ phím.
            </p>
            <div className="mt-3 rounded-lg border border-black/15 bg-white p-2.5 font-mono text-xs font-bold text-zinc-700">
              🎤 &ldquo;Thêm khối in&rdquo; → Khối In xuất hiện
            </div>
          </div>

          <div className="rounded-2xl border-2 border-black bg-[#e7fff3] p-5 shadow-[4px_4px_0_#121212]">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-black bg-[#7df2c3] text-lg font-black text-black shadow-[2px_2px_0_#121212]">
              🧩
            </div>
            <h3 className="font-heading mt-3 text-lg font-black text-black">Học bằng kéo thả</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-700">
              Kéo các khối lệnh vào vùng làm việc và kết nối chúng lại. Tư duy thuật toán trực quan, không lo lỗi cú pháp — không cần bật microphone.
            </p>
            <div className="mt-3 rounded-lg border border-black/15 bg-white p-2.5 font-mono text-xs font-bold text-zinc-700">
              🧩 Kéo khối → Thả vào vùng → Chạy chương trình
            </div>
          </div>
        </div>
      </section>

      {/* Tier 2: Detailed Voice Guide Section */}
      <DetailedVoiceGuide />



      {/* 5 Lessons Curriculum Grid */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-md border border-black bg-[#ff8a65] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212]">
              Giáo trình
            </span>
            <h2 className="font-heading text-xl font-black uppercase tracking-tight text-black sm:text-2xl">
              Nội dung các bài học
            </h2>
          </div>
          <Link
            className="text-xs font-black uppercase text-black underline decoration-2 underline-offset-4"
            href="/demo"
          >
            Xem tất cả bài học →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson) => (
            <Link
              className="group flex flex-col justify-between rounded-2xl border-2 border-black bg-white p-5 shadow-[3px_3px_0_#121212] transition-all hover:-translate-y-1 hover:shadow-[5px_5px_0_#121212]"
              href={`/demo/${lesson.slug}`}
              key={lesson.id}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded border border-black bg-[#ffce47] px-2 py-0.5 text-[10px] font-black uppercase text-black">
                    Bài {lesson.orderIndex}
                  </span>
                  <span className="text-[11px] font-bold text-zinc-600">
                    {lesson.stepCount} bước
                  </span>
                </div>
                <h3 className="font-heading mt-2.5 text-base font-black text-black group-hover:text-[#9f2348]">
                  {lesson.title}
                </h3>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-zinc-700">
                  {lesson.summary}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-3 text-xs font-bold">
                <span className="text-zinc-600">Thực hành</span>
                <span className="inline-flex items-center gap-1 text-black font-black uppercase">
                  Bắt đầu →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t-2 border-black/15 pt-6 text-xs font-semibold text-zinc-600">
        <div className="flex items-center gap-3">
          <span>© SAYNTAX — Công nghệ không rào cản.</span>
          <Link className="underline decoration-1 underline-offset-4 hover:text-black" href="/privacy">
            Quyền riêng tư
          </Link>
        </div>
        <p>Hỗ trợ giọng nói tiếng Việt · Blockly 12</p>
      </footer>
    </main>
  );
}
