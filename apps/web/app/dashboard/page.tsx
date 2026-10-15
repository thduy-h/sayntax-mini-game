import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listSeedV2Lessons } from "@shecancode/lesson-engine";
import { FormSubmitButton } from "@/components/form-submit-button";
import { signOutAction } from "@/features/auth/server/actions";
import { AppNav } from "@/components/app-nav";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
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
        <Card className="bg-[#ffefb8] p-6 sm:p-9">
          <CardHeader>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#744823]">{COURSE_TITLE}</p>
            <h1 className="font-heading text-4xl font-black leading-tight sm:text-5xl" id="continue-heading">
              {nextLesson ? completedSteps > 0 ? "Tiếp tục học" : "Bắt đầu học lập trình" : "Bạn đã hoàn thành khóa học!"}
            </h1>
            <CardDescription className="text-base font-semibold text-zinc-800">
              {nextLesson ? `Bài ${nextLesson.orderIndex}: ${nextLesson.title}` : "Bạn đã hoàn thành cả 5 bài học. Hãy mở lại một bài để luyện tập thêm."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Link className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-black bg-[#ff5f87] px-6 py-3 font-black text-black shadow-[3px_3px_0_#121212] transition hover:bg-[#ff7b9c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black" href={nextLesson ? `/lessons-v2/${nextLesson.slug}` as Route : "/lessons-v2"}>
              {nextLesson ? completedSteps > 0 ? "Tiếp tục bài học" : "Bắt đầu bài đầu tiên" : "Ôn lại bài học"}
            </Link>
            <p className="text-sm text-zinc-700">Giọng nói, nhập lệnh hoặc kéo thả — chọn cách phù hợp với bạn.</p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="progress-heading" id="progress" className="rounded-2xl border-2 border-black bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-2xl font-black" id="progress-heading">Tiến độ của bạn</h2>
          <p className="text-sm text-zinc-600">{available ? `${completedLessons}/${lessons.length} bài hoàn thành` : "Chưa tải được tiến độ"}</p>
        </div>
        {available ? <>
          <progress aria-label="Tiến độ khóa học" className="mt-4 h-4 w-full overflow-hidden rounded-full accent-[#21745b]" max={totalSteps} value={completedSteps} />
          <p className="mt-2 text-sm text-zinc-600">{completedSteps}/{totalSteps} bước đã hoàn thành</p>
        </> : <p className="mt-3 text-sm text-zinc-600">Bạn vẫn có thể chọn bài học trong khi chờ kết nối trở lại.</p>}
      </section>

      <section aria-labelledby="lessons-heading">
        <h2 className="font-heading mb-4 text-2xl" id="lessons-heading">Danh sách bài học</h2>
        <div className="divide-y-2 divide-black rounded-2xl border-2 border-black bg-white">
          {lessons.map((lesson) => {
            const done = Math.min(counts[lesson.slug] ?? 0, lesson.stepCount);
            const complete = done >= lesson.stepCount;
            return <div key={lesson.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-4 transition hover:bg-[#fffdf3] sm:px-6">
              <span className="w-10 shrink-0 text-2xl font-black text-[#a1284b]">{String(lesson.orderIndex).padStart(2, "0")}</span>
              <div className="min-w-[180px] flex-1">
                <h3 className="text-lg font-black">{lesson.title}</h3>
                <p className="text-sm leading-6 text-zinc-700">{lesson.summary}</p>
              </div>
              <div className="flex min-w-[140px] flex-wrap items-center gap-2 text-xs font-semibold text-zinc-700">
                <span>{available ? `${done}/${lesson.stepCount} bước` : `${lesson.stepCount} bước`}</span>
                <span>·</span>
                <span>{available && complete ? "Đã hoàn thành" : available && done > 0 ? "Đang học" : "Sẵn sàng học"}</span>
              </div>
              <Link aria-label={`${complete ? "Ôn lại" : done > 0 ? "Tiếp tục" : "Bắt đầu"}: ${lesson.title}`} className="inline-flex min-h-11 items-center rounded-lg px-3 font-black text-black underline underline-offset-4 hover:bg-[#e7fff3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black" href={`/lessons-v2/${lesson.slug}` as Route}>
                {complete ? "Ôn lại" : done > 0 ? "Tiếp tục" : "Bắt đầu"} →
              </Link>
            </div>;
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
