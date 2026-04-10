import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSeedLessonById } from "@shecancode/lesson-engine";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAppUser } from "@/features/auth/server/data";
import { LessonWorkspace } from "@/features/block-workspace/components/lesson-workspace";
import { getLessonProgressMap } from "@/features/progress/server/data";

export const dynamic = "force-dynamic";

interface LessonDetailPageProps {
  params: Promise<{ lessonId: string }>;
}

export default async function LessonDetailPage({ params }: LessonDetailPageProps) {
  const appUser = await getCurrentAppUser();

  if (!appUser) redirect("/sign-in");
  if (!appUser.onboarding_completed) redirect("/onboarding");

  const { lessonId } = await params;
  const lesson = getSeedLessonById(lessonId);

  if (!lesson) notFound();

  const progressMap = await getLessonProgressMap(lesson.databaseLessonId);
  const completedSteps = lesson.steps.filter((step) => progressMap[step.databaseStepId] === "completed").length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link className="text-sm font-black uppercase text-black underline decoration-4 underline-offset-4" href="/lessons">
            ← Quay lại danh sách bài học
          </Link>
          <h1 className="font-heading mt-3 text-4xl text-black sm:text-5xl">{lesson.title}</h1>
        </div>
        <Card className="max-w-md bg-[#e7fff3]">
          <CardHeader>
            <CardTitle className="text-lg">Tiến độ nhanh</CardTitle>
            <CardDescription>
              {completedSteps}/{lesson.stepCount} bước đã xong. Thời lượng ước tính khoảng {lesson.estimatedMinutes} phút.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <LessonWorkspace initialProgress={progressMap} lesson={lesson} />
    </main>
  );
}
