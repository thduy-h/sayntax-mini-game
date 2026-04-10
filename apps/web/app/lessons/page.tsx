import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listSeedLessons } from "@shecancode/lesson-engine";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAppUser } from "@/features/auth/server/data";
import { getLessonProgressSummaries } from "@/features/progress/server/data";

export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const appUser = await getCurrentAppUser();

  if (!appUser) redirect("/sign-in");
  if (!appUser.onboarding_completed) redirect("/onboarding");

  const lessons = listSeedLessons();
  const progressSummaries = await getLessonProgressSummaries(lessons.map((lesson) => lesson.databaseLessonId));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:px-10">
      <Card className="grid-sheen bg-[#ff5f87]">
        <CardHeader>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-black">Bài học</p>
          <CardTitle className="max-w-4xl text-4xl sm:text-5xl">Chọn một bài, vào workspace và hoàn thành từng bước ngắn.</CardTitle>
          <CardDescription>
            Mỗi bài có tiến độ riêng, phần hướng dẫn bên phải và canvas Blockly ở giữa để giữ nhịp học rõ ràng.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lessons.map((lesson, index) => (
          <Link key={lesson.id} href={`/lessons/${lesson.id}` as Route}>
            <Card className={`h-full transition hover:-translate-y-1 ${index % 3 === 0 ? "bg-[#fff6fb]" : index % 3 === 1 ? "bg-[#ffefb8]" : "bg-[#e7fff3]"}`}>
              <CardHeader>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-black">Bài {lesson.orderIndex}</p>
                <CardTitle>{lesson.title}</CardTitle>
                <CardDescription>{lesson.summary}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm font-semibold text-zinc-700">
                <span>{progressSummaries[lesson.databaseLessonId]?.completed ?? 0}/{lesson.stepCount} bước hoàn thành</span>
                <span className="font-black uppercase text-black">Mở</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </main>
  );
}
