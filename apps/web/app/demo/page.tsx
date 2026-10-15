import type { Route } from "next";
import Link from "next/link";
import { getSeedV2LessonBySlug, listSeedV2Lessons } from "@shecancode/lesson-engine";
import { BrandLogo } from "@/components/brand-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DemoLessonsPage() {
  const lessons = listSeedV2Lessons().map((lesson) => ({
    ...lesson,
    estimatedMinutes: getSeedV2LessonBySlug(lesson.slug)?.estimatedMinutes ?? 0,
  }));

  return (
    <main className="mx-auto flex min-h-[80dvh] w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-10">
      <nav className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-black/15 bg-white px-4 py-3 shadow-sm">
        <Link aria-label="SAYNTAX - về trang giới thiệu" className="flex min-h-12 items-center" href="/">
          <BrandLogo className="w-[160px] sm:w-[180px]" priority />
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link className="inline-flex min-h-11 items-center rounded-[0.75rem] border-2 border-black bg-[#fffdf3] px-3 py-2 text-xs font-black uppercase text-black" href="/sign-in">
            Đăng nhập
          </Link>
        </div>
      </nav>

      <Card className="grid-sheen bg-[#a8e6ff]">
        <CardHeader>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-black">Chế độ demo</p>
          <h1 className="font-heading max-w-3xl text-3xl leading-tight sm:text-4xl">Chọn bài học thử</h1>
          <CardDescription>
            Không cần tài khoản. Học bằng giọng nói, nhập lệnh hoặc kéo thả khối. Tiến độ học thử lưu trên thiết bị này.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lessons.map((lesson, index) => (
          <Link href={`/demo/${lesson.slug}` as Route} key={lesson.id}>
            <Card className={`h-full transition hover:-translate-y-0.5 ${index === 0 ? "bg-[#fff6fb]" : "bg-white"}`}>
              <CardHeader>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-black">Bài {lesson.orderIndex}</p>
                <CardTitle>{lesson.title}</CardTitle>
                <CardDescription>{lesson.summary}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4 text-sm font-semibold text-zinc-700">
                <span>{lesson.stepCount} bước</span>
                <span>{lesson.estimatedMinutes} phút</span>
                <span className="font-black uppercase text-black">Học thử</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </main>
  );
}
