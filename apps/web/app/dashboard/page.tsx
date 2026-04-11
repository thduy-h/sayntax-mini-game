import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listSeedV2Lessons } from "@shecancode/lesson-engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOutAction } from "@/features/auth/server/actions";
import { getCurrentAppUser } from "@/features/auth/server/data";

export const dynamic = "force-dynamic";

const COURSE_TITLE = "Nền tảng tư duy tính toán";

export default async function DashboardPage() {
  const appUser = await getCurrentAppUser();

  if (!appUser) redirect("/sign-in");
  if (!appUser.onboarding_completed) redirect("/onboarding");
  if (appUser.role === "admin") redirect("/admin");

  const lessons = listSeedV2Lessons();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:px-10">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="grid-sheen bg-[#ffefb8]">
          <CardHeader>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-black">Bảng học tập</p>
            <CardTitle className="max-w-3xl text-4xl sm:text-5xl">Chào mừng quay lại, {appUser.email}</CardTitle>
            <CardDescription>
              Mỗi bài học dạy đúng một thao tác — thêm khối, đặt chữ, đặt số, chạy chương trình — bằng giọng nói tiếng Việt.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Link className="inline-flex min-h-12 items-center rounded-[1rem] border-4 border-black bg-[#a8e6ff] px-5 py-3 font-black uppercase text-black shadow-[6px_6px_0_#121212]" href="/lessons-v2">
              Vào bài học
            </Link>
            <Link className="inline-flex min-h-12 items-center rounded-[1rem] border-4 border-black bg-[#7df2c3] px-5 py-3 font-black uppercase text-black shadow-[6px_6px_0_#121212]" href="/role-models">
              Góc truyền cảm hứng
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Tài khoản</CardTitle>
            <CardDescription>Thông tin cơ bản của học sinh đã được lưu và sẵn sàng cho các bước tiếp theo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm font-semibold text-zinc-800">
            <p>
              <strong>Vai trò:</strong> Học sinh
            </p>
            <p>
              <strong>Khóa học:</strong> {COURSE_TITLE}
            </p>
            <form action={signOutAction}>
              <Button className="w-full" type="submit" variant="outline">
                Đăng xuất
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lessons.map((lesson, index) => (
          <Card key={lesson.id} className={index % 2 === 0 ? "bg-[#fff6fb]" : "bg-[#e7fff3]"}>
            <CardHeader>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-black">Bài {lesson.orderIndex}</p>
              <CardTitle>{lesson.title}</CardTitle>
              <CardDescription>{lesson.summary}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm font-semibold text-zinc-700">
              <span>{lesson.stepCount} bước</span>
              <Link className="font-black uppercase text-black underline decoration-4 underline-offset-4" href={`/lessons-v2/${lesson.slug}` as Route}>Mở</Link>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
