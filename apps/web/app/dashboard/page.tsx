import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listSeedV2Lessons } from "@shecancode/lesson-engine";
import { FormSubmitButton } from "@/components/form-submit-button";
import { signOutAction } from "@/features/auth/server/actions";
import { AppNav } from "@/components/app-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <AppNav />
      {params.error ? <p role="alert" className="rounded-2xl bg-rose-100 p-4 text-rose-900">Chưa thể đăng xuất. Vui lòng thử lại.</p> : null}
      {!available ? <p role="alert" className="rounded-2xl bg-amber-100 p-4 text-amber-950">Chưa thể tải tiến độ đã lưu. Hãy tải lại trang sau ít phút; bạn vẫn có thể mở bài học.</p> : null}
      <section aria-labelledby="continue-heading">
        <Card className="bg-[#ffefb8]">
          <CardHeader>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">{COURSE_TITLE}</p>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl" id="continue-heading">
              {nextLesson ? completedSteps > 0 ? "Tiếp tục học" : "Bắt đầu học lập trình" : "Bạn đã hoàn thành khóa học!"}
            </h1>
            <CardDescription>
              {nextLesson ? `Bài ${nextLesson.orderIndex}: ${nextLesson.title}` : "Bạn đã hoàn thành cả 5 bài học. Hãy mở lại một bài để luyện tập thêm."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Link className="inline-flex min-h-12 items-center justify-center rounded-xl border border-black bg-[#ff5f87] px-5 py-3 font-bold text-black shadow-sm transition hover:bg-[#ff7b9c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black" href={nextLesson ? `/lessons-v2/${nextLesson.slug}` as Route : "/lessons-v2"}>
              {nextLesson ? completedSteps > 0 ? "Tiếp tục bài học" : "Bắt đầu bài đầu tiên" : "Ôn lại bài học"}
            </Link>
            <p className="text-sm text-zinc-700">Giọng nói, nhập lệnh hoặc kéo thả — chọn cách phù hợp với bạn.</p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="progress-heading" id="progress" className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-xl" id="progress-heading">Tiến độ của bạn</h2>
          <p className="text-sm text-zinc-600">{available ? `${completedLessons}/${lessons.length} bài hoàn thành` : "Chưa tải được tiến độ"}</p>
        </div>
        {available ? <>
          <progress aria-label="Tiến độ khóa học" className="mt-4 h-3 w-full overflow-hidden rounded-full accent-[#21745b]" max={totalSteps} value={completedSteps} />
          <p className="mt-2 text-sm text-zinc-600">{completedSteps}/{totalSteps} bước đã hoàn thành</p>
        </> : <p className="mt-3 text-sm text-zinc-600">Bạn vẫn có thể chọn bài học trong khi chờ kết nối trở lại.</p>}
      </section>

      <section aria-labelledby="lessons-heading">
        <h2 className="font-heading mb-4 text-2xl" id="lessons-heading">Danh sách bài học</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lessons.map((lesson) => {
            const done = Math.min(counts[lesson.slug] ?? 0, lesson.stepCount);
            const complete = done >= lesson.stepCount;
            return <Card key={lesson.id} className="flex min-w-0 flex-col bg-white">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-600">Bài {lesson.orderIndex}</p>
                  {available && complete ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">✓ Đã hoàn thành</span> : <span className="text-xs text-zinc-600">{available && done > 0 ? "Đang học" : "Sẵn sàng học"}</span>}
                </div>
                <CardTitle className="text-xl normal-case">{lesson.title}</CardTitle>
                <CardDescription>{lesson.summary}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 items-end justify-between gap-3 text-sm">
                <span className="text-zinc-600">{available ? `${done}/${lesson.stepCount} bước` : `${lesson.stepCount} bước`}</span>
                <Link aria-label={`${complete ? "Ôn lại" : done > 0 ? "Tiếp tục" : "Bắt đầu"}: ${lesson.title}`} className="inline-flex min-h-11 items-center rounded-lg px-3 font-bold text-black underline underline-offset-4 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black" href={`/lessons-v2/${lesson.slug}` as Route}>
                  {complete ? "Ôn lại" : done > 0 ? "Tiếp tục" : "Bắt đầu"} →
                </Link>
              </CardContent>
            </Card>;
          })}
        </div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
        <div className="min-w-0">
          <p className="break-all text-sm text-zinc-600">{appUser.email}</p>
          <Link className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4" href="/role-models">Góc truyền cảm hứng →</Link>
        </div>
        <form action={signOutAction}>
          <FormSubmitButton pendingLabel="Đang đăng xuất..." size="sm" variant="ghost">Đăng xuất</FormSubmitButton>
        </form>
      </footer>
    </main>
  );
}
