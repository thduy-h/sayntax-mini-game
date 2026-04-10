import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSeedV2LessonBySlug, type LessonV2WithSteps } from "@shecancode/lesson-engine";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAppUser } from "@/features/auth/server/data";
import { VoiceLessonClient } from "@/features/lesson-v2/components/voice-lesson-client";

export const dynamic = "force-dynamic";

interface LessonV2DetailPageProps {
  params: Promise<{ slug: string }>;
}

function getActionLabel(action: LessonV2WithSteps["steps"][number]["action"]) {
  return action.kind;
}

function StepCard({ step }: { step: LessonV2WithSteps["steps"][number] }) {
  return (
    <Card className="bg-[#fffdf3]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-black">Bước {step.orderIndex}</p>
            <CardTitle className="mt-2 text-xl">{step.title}</CardTitle>
          </div>
          <span className="rounded-full border-2 border-black bg-[#ffefb8] px-3 py-1 text-xs font-black uppercase text-black">
            {getActionLabel(step.action)}
          </span>
        </div>
        <CardDescription>{step.instructions}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-600">{step.hints[0]}</p>
      </CardContent>
    </Card>
  );
}

export default async function LessonV2DetailPage({ params }: LessonV2DetailPageProps) {
  const appUser = await getCurrentAppUser();

  if (!appUser) redirect("/sign-in");
  if (!appUser.onboarding_completed) redirect("/onboarding");

  const { slug } = await params;
  const lesson: LessonV2WithSteps | null = getSeedV2LessonBySlug(slug);

  if (!lesson) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link className="text-sm font-black uppercase text-black underline decoration-4 underline-offset-4" href="/lessons-v2">
            ← Quay lại danh sách bài học V2
          </Link>
          <h1 className="font-heading mt-3 text-4xl text-black sm:text-5xl">{lesson.title}</h1>
        </div>
        <Card className="max-w-md bg-[#e7fff3]">
          <CardHeader>
            <CardTitle className="text-lg">Tóm tắt nhanh</CardTitle>
            <CardDescription>
              {lesson.stepCount} bước, khoảng {lesson.estimatedMinutes} phút, mục tiêu đầu tiên: {lesson.learningGoals[0]}.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <VoiceLessonClient lesson={lesson} />

      <section className="grid gap-4 xl:grid-cols-2">
        {lesson.steps.map((step) => (
          <StepCard key={step.id} step={step} />
        ))}
      </section>
    </main>
  );
}
