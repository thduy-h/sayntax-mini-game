import type { Route } from "next";
import Link from "next/link";
import { getSeedV2LessonBySlug, listSeedV2Lessons } from "@shecancode/lesson-engine";
import { BrandLogo } from "@/components/brand-logo";

export default function DemoLessonsPage() {
  const lessons = listSeedV2Lessons().map((lesson) => ({
    ...lesson,
    estimatedMinutes: getSeedV2LessonBySlug(lesson.slug)?.estimatedMinutes ?? 0,
  }));

  return (
    <main className="mx-auto flex min-h-[85dvh] w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-8">
      {/* Top Navbar */}
      <nav className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-black bg-white px-5 py-3.5 shadow-[4px_4px_0_#121212]">
        <Link aria-label="SAYNTAX - về trang chính" className="flex items-center" href="/">
          <BrandLogo className="w-[160px] sm:w-[180px]" priority />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            className="inline-flex items-center rounded-xl border-2 border-black bg-[#fffdf3] px-3.5 py-2 text-xs font-black uppercase text-black shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            href="/sign-in"
          >
            Đăng nhập
          </Link>
        </div>
      </nav>

      {/* Hero Banner */}
      <section className="rounded-3xl border-2 border-black bg-[#a8e6ff] p-6 shadow-[5px_5px_0_#121212] sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-black bg-white px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212]">
            Chế độ học thử
          </span>
          <span className="rounded-md border border-black bg-[#7df2c3] px-2.5 py-0.5 text-xs font-bold text-black shadow-[2px_2px_0_#121212]">
            Không cần tài khoản
          </span>
        </div>
        <h1 className="font-heading mt-4 text-3xl font-black leading-tight text-black sm:text-4xl">
          Chọn bài học thử nghiệm
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-zinc-800 sm:text-base">
          Trải nghiệm đầy đủ học bằng giọng nói tiếng Việt, gõ phím hoặc kéo thả Blockly. Tiến độ học thử sẽ được lưu an toàn trực tiếp trên trình duyệt của bạn.
        </p>
      </section>

      {/* Lesson Grid */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {lessons.map((lesson, index) => {
          const bgColors = ["bg-[#fff6fb]", "bg-[#ffefb8]", "bg-[#e7fff3]", "bg-[#fffdf3]", "bg-[#f0f4ff]"];
          const cardBg = bgColors[index % bgColors.length];
          return (
            <Link
              className="group flex flex-col justify-between rounded-2xl border-2 border-black bg-white p-5 shadow-[3px_3px_0_#121212] transition-all hover:-translate-y-1 hover:shadow-[5px_5px_0_#121212]"
              href={`/demo/${lesson.slug}` as Route}
              key={lesson.id}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md border border-black bg-[#ffce47] px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-black">
                    Bài {lesson.orderIndex}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600">
                    <span>{lesson.stepCount} bước</span>
                    <span>·</span>
                    <span>~{lesson.estimatedMinutes} phút</span>
                  </div>
                </div>

                <div className={`mt-3 rounded-xl border-2 border-black ${cardBg} p-3.5`}>
                  <h2 className="font-heading text-lg font-black text-black group-hover:text-[#9f2348]">
                    {lesson.title}
                  </h2>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-700">
                    {lesson.summary}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t-2 border-black/10 pt-3">
                <span className="text-xs font-bold text-zinc-600">
                  {lesson.stepCount} bước · Thực hành
                </span>
                <span className="inline-flex items-center rounded-lg border-2 border-black bg-black px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-[2px_2px_0_#ff5f87] transition-transform group-hover:bg-[#ff5f87] group-hover:text-black">
                  Học thử →
                </span>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
