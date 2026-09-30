import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSeedV2LessonBySlug, listSeedV2Lessons, type LessonV2Preview } from "@shecancode/lesson-engine";
import { AppNav } from "@/components/app-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAppUser } from "@/features/auth/server/data";
import { getLessonV2CompletionCounts } from "@/features/lesson-v2/server/progress-data";

export const dynamic = "force-dynamic";

type LessonCard = LessonV2Preview & { estimatedMinutes: number; completedCount: number };

export default async function LessonsV2Page() {
  const appUser = await getCurrentAppUser();

  if (!appUser) redirect(`/sign-in?callbackUrl=${encodeURIComponent("/lessons-v2")}`);
  if (!appUser.onboarding_completed) redirect("/onboarding");

  const counts = await getLessonV2CompletionCounts();
  const lessons: LessonCard[] = listSeedV2Lessons().map((lesson) => ({
    ...lesson,
    estimatedMinutes: getSeedV2LessonBySlug(lesson.slug)?.estimatedMinutes ?? 0,
    completedCount: Math.min(counts[lesson.slug] ?? 0, lesson.stepCount),
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:px-10">
      <AppNav />
      <Card className="grid-sheen bg-[#a8e6ff]">
        <CardHeader>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-black">Bài học</p>
          <CardTitle className="max-w-4xl text-4xl sm:text-5xl">Bài học — học bằng giọng nói</CardTitle>
          <CardDescription>
            Mỗi bước chỉ dạy một hành động. Nói câu lệnh, xem khối xuất hiện, và tiếp tục.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lessons.map((lesson, index) => {
          const isDone = lesson.completedCount >= lesson.stepCount;
          const inProgress = lesson.completedCount > 0 && !isDone;
          const pct = Math.round((lesson.completedCount / Math.max(lesson.stepCount, 1)) * 100);
          return (
            <Link key={lesson.id} href={`/lessons-v2/${lesson.slug}` as Route}>
              <Card className={`h-full transition hover:-translate-y-1 ${index % 3 === 0 ? "bg-[#fff6fb]" : index % 3 === 1 ? "bg-[#ffefb8]" : "bg-[#e7fff3]"}`}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-black">
                      Bài {lesson.orderIndex}
                    </p>
                    {isDone && (
                      <span className="rounded border-2 border-black bg-[#7df2c3] px-2 py-0.5 text-[10px] font-black uppercase text-black">
                        Đã xong
                      </span>
                    )}
                    {inProgress && (
                      <span className="rounded border-2 border-black bg-[#ffb84d] px-2 py-0.5 text-[10px] font-black uppercase text-black">
                        Đang học
                      </span>
                    )}
                  </div>
                  <CardTitle>{lesson.title}</CardTitle>
                  <CardDescription>{lesson.summary}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="h-2 w-full overflow-hidden rounded border-2 border-black bg-white">
                    <div
                      className="h-full bg-black transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm font-semibold text-zinc-700">
                    <span>
                      {lesson.completedCount}/{lesson.stepCount} bước
                    </span>
                    <span>{lesson.estimatedMinutes} phút</span>
                    <span className="font-black uppercase text-black">
                      {isDone ? "Ôn lại" : inProgress ? "Tiếp tục" : "Mở"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
      <Card className="bg-white" id="help">
        <CardHeader>
          <CardTitle>Cách học bằng giọng nói</CardTitle>
          <CardDescription>Mở một bài, đọc yêu cầu của bước hiện tại, rồi bấm “Bắt đầu nói”.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-800">
          <p>Mỗi bước có một câu mẫu. Em có thể nói câu đó hoặc nhập vào thanh lệnh ở cuối màn hình và bấm “Thực hiện”.</p>
          <p>Nếu micro chưa sẵn sàng, nhập lệnh vẫn dùng được. Trong bài học, nói “gợi ý” để xem trợ giúp cho bước đang làm.</p>
        </CardContent>
      </Card>
    </main>
  );
}
