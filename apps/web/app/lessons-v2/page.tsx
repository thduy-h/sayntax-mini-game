import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSeedV2LessonBySlug, listSeedV2Lessons, type LessonV2Preview } from "@shecancode/lesson-engine";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAppUser } from "@/features/auth/server/data";

export const dynamic = "force-dynamic";

type LessonCard = LessonV2Preview & { estimatedMinutes: number };

export default async function LessonsV2Page() {
  const appUser = await getCurrentAppUser();

  if (!appUser) redirect("/sign-in");
  if (!appUser.onboarding_completed) redirect("/onboarding");

  const lessons: LessonCard[] = listSeedV2Lessons().map((lesson) => ({
    ...lesson,
    estimatedMinutes: getSeedV2LessonBySlug(lesson.slug)?.estimatedMinutes ?? 0,
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:px-10">
      <Card className="grid-sheen bg-[#a8e6ff]">
        <CardHeader>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-black">Bài học V2</p>
          <CardTitle className="max-w-4xl text-4xl sm:text-5xl">Bài học V2 — học bằng giọng nói</CardTitle>
          <CardDescription>
            Mỗi bước chỉ dạy một hành động. Nói câu lệnh, xem khối xuất hiện, và tiếp tục.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lessons.map((lesson, index) => (
          <Link key={lesson.id} href={`/lessons-v2/${lesson.slug}` as Route}>
            <Card className={`h-full transition hover:-translate-y-1 ${index % 3 === 0 ? "bg-[#fff6fb]" : index % 3 === 1 ? "bg-[#ffefb8]" : "bg-[#e7fff3]"}`}>
              <CardHeader>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-black">Bài {lesson.orderIndex}</p>
                <CardTitle>{lesson.title}</CardTitle>
                <CardDescription>{lesson.summary}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4 text-sm font-semibold text-zinc-700">
                <span>{lesson.stepCount} bước</span>
                <span>{lesson.estimatedMinutes} phút</span>
                <span className="font-black uppercase text-black">Mở</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </main>
  );
}
