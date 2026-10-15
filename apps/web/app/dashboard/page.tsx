import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listSeedV2Lessons } from "@shecancode/lesson-engine";
import { FormSubmitButton } from "@/components/form-submit-button";
import { signOutAction } from "@/features/auth/server/actions";
import { AppNav } from "@/components/app-nav";
import { getCurrentAppUser } from "@/features/auth/server/data";
import { getLessonV2CompletionSummary } from "@/features/lesson-v2/server/progress-data";

export const dynamic = "force-dynamic";

const COURSE_TITLE = "Nền tảng tư duy tính toán";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const appUser = await getCurrentAppUser();

  if (!appUser) redirect(`/sign-in?callbackUrl=${encodeURIComponent("/dashboard")}`);
  if (!appUser.onboarding_completed) redirect("/onboarding");
  if (appUser.role === "admin") redirect("/admin");

  const lessons = listSeedV2Lessons();
  const { counts, available } = await getLessonV2CompletionSummary();
  const completedLessons = lessons.filter((lesson) => (counts[lesson.slug] ?? 0) >= lesson.stepCount).length;
  const completedSteps = lessons.reduce((total, lesson) => total + Math.min(counts[lesson.slug] ?? 0, lesson.stepCount), 0);
  const totalSteps = lessons.reduce((total, lesson) => total + lesson.stepCount, 0);
  const nextLesson = lessons.find((lesson) => (counts[lesson.slug] ?? 0) < lesson.stepCount);
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <AppNav />

      {params.error ? (
        <p role="alert" className="rounded-xl border-2 border-black bg-rose-100 p-4 font-bold text-rose-950 shadow-[3px_3px_0_#121212]">
          Chưa thể đăng xuất. Vui lòng thử lại.
        </p>
      ) : null}

      {!available ? (
        <p role="alert" className="rounded-xl border-2 border-black bg-amber-100 p-4 font-bold text-amber-950 shadow-[3px_3px_0_#121212]">
          Chưa thể tải tiến độ đã lưu. Hãy tải lại trang sau ít phút; bạn vẫn có thể mở bài học bình thường.
        </p>
      ) : null}

      {/* Hero Continue Card */}
      <section aria-labelledby="continue-heading">
        <div className="rounded-3xl border-2 border-black bg-[#ffefb8] p-6 shadow-[5px_5px_0_#121212] sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-black bg-white px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212]">
              {COURSE_TITLE}
            </span>
            <span className="rounded-md border border-black bg-[#7df2c3] px-2.5 py-0.5 text-xs font-bold text-black shadow-[2px_2px_0_#121212]">
              {completedLessons === lessons.length ? "Đã xong toàn bộ" : "Tiến độ học tập"}
            </span>
          </div>

          <h1 className="font-heading mt-4 text-3xl font-black leading-tight text-black sm:text-4xl" id="continue-heading">
            {nextLesson
              ? completedSteps > 0
                ? "Tiếp tục bài học"
                : "Bắt đầu học lập trình"
              : "Bạn đã hoàn thành khóa học!"}
          </h1>

          <p className="mt-2 max-w-2xl text-base font-semibold text-zinc-800">
            {nextLesson
              ? `Bài ${nextLesson.orderIndex}: ${nextLesson.title}`
              : "Bạn đã hoàn thành cả 5 bài học. Hãy mở lại một bài bất kỳ để ôn luyện thêm."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-black bg-[#ff5f87] px-6 py-3 font-black text-black shadow-[3px_3px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0"
              href={nextLesson ? (`/lessons-v2/${nextLesson.slug}` as Route) : "/lessons-v2"}
            >
              {nextLesson ? (completedSteps > 0 ? "Tiếp tục bài học →" : "Bắt đầu bài đầu tiên →") : "Ôn lại bài học →"}
            </Link>
            <p className="text-xs font-bold text-zinc-700">
              Học bằng giọng nói, nhập câu lệnh hoặc kéo thả khối Blockly.
            </p>
          </div>
        </div>
      </section>

      {/* Progress Section */}
      <section
        aria-labelledby="progress-heading"
        id="progress"
        className="rounded-2xl border-2 border-black bg-white p-5 shadow-[4px_4px_0_#121212] sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded border border-black bg-[#ffce47] px-2 py-0.5 text-[11px] font-black uppercase text-black">
              Tổng kết
            </span>
            <h2 className="font-heading text-lg font-black text-black sm:text-xl" id="progress-heading">
              Tiến độ của bạn
            </h2>
          </div>
          <p className="text-xs font-black uppercase tracking-wider text-black">
            {available ? `${completedLessons}/${lessons.length} bài đã xong (${progressPercent}%)` : "Chưa tải được tiến độ"}
          </p>
        </div>

        {available ? (
          <div className="mt-4 space-y-2">
            <div className="h-5 w-full overflow-hidden rounded-xl border-2 border-black bg-zinc-100 p-0.5 shadow-inner">
              <div
                className="h-full rounded-lg bg-[#21745b] transition-all duration-300"
                style={{ width: `${Math.max(progressPercent, 2)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-bold text-zinc-600">
              <span>0 bước</span>
              <span>{completedSteps}/{totalSteps} bước hoàn thành</span>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">
            Bạn vẫn có thể chọn bài học trong khi chờ kết nối trở lại.
          </p>
        )}
      </section>

      {/* Lesson List */}
      <section aria-labelledby="lessons-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="rounded border border-black bg-[#ff8a65] px-2 py-0.5 text-[11px] font-black uppercase text-black">
            Danh sách
          </span>
          <h2 className="font-heading text-xl font-black text-black sm:text-2xl" id="lessons-heading">
            Các bài học trong khóa
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lessons.map((lesson) => {
            const done = Math.min(counts[lesson.slug] ?? 0, lesson.stepCount);
            const complete = done >= lesson.stepCount;
            const inProgress = done > 0 && !complete;

            return (
              <div
                key={lesson.id}
                className="flex flex-col justify-between rounded-2xl border-2 border-black bg-white p-5 shadow-[3px_3px_0_#121212] transition-transform hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded border border-black bg-[#ffce47] px-2 py-0.5 text-[10px] font-black uppercase text-black">
                      Bài {lesson.orderIndex}
                    </span>
                    {available && complete ? (
                      <span className="rounded border-2 border-black bg-[#7df2c3] px-2 py-0.5 text-[10px] font-black uppercase text-black">
                        ✓ Đã hoàn thành
                      </span>
                    ) : available && inProgress ? (
                      <span className="rounded border-2 border-black bg-[#ffb84d] px-2 py-0.5 text-[10px] font-black uppercase text-black">
                        Đang học
                      </span>
                    ) : (
                      <span className="rounded border border-black/30 bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                        Sẵn sàng
                      </span>
                    )}
                  </div>

                  <h3 className="font-heading mt-3 text-lg font-black text-black">
                    {lesson.title}
                  </h3>
                  <p className="mt-1.5 text-xs font-medium leading-relaxed text-zinc-700">
                    {lesson.summary}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-3">
                  <span className="text-xs font-bold text-zinc-600">
                    {available ? `${done}/${lesson.stepCount} bước` : `${lesson.stepCount} bước`}
                  </span>
                  <Link
                    aria-label={`${complete ? "Ôn lại" : inProgress ? "Tiếp tục" : "Bắt đầu"}: ${lesson.title}`}
                    className="inline-flex min-h-9 items-center rounded-lg border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase text-black shadow-[2px_2px_0_#121212] transition-all hover:bg-[#ff5f87] active:translate-y-0"
                    href={`/lessons-v2/${lesson.slug}` as Route}
                  >
                    {complete ? "Ôn lại" : inProgress ? "Tiếp tục" : "Bắt đầu"} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t-2 border-black/15 pt-5">
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-700">
          <span className="rounded-md border border-black/20 bg-zinc-100 px-2.5 py-1">
            {appUser.email}
          </span>
          <Link
            className="underline decoration-2 underline-offset-4 hover:text-black"
            href="/role-models"
          >
            Góc truyền cảm hứng →
          </Link>
        </div>
        <form action={signOutAction}>
          <FormSubmitButton pendingLabel="Đang đăng xuất..." size="sm" variant="ghost">
            Đăng xuất
          </FormSubmitButton>
        </form>
      </footer>
    </main>
  );
}
