import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSeedV2LessonBySlug, type LessonV2WithSteps } from "@shecancode/lesson-engine";
import { AppNav } from "@/components/app-nav";
import { getCurrentAppUser } from "@/features/auth/server/data";
import { VoiceLessonClient } from "@/features/lesson-v2/components/voice-lesson-client";
import { getLessonV2Progress } from "@/features/lesson-v2/server/progress-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface LessonV2DetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function LessonV2DetailPage({ params }: LessonV2DetailPageProps) {
  const { slug } = await params;
  const appUser = await getCurrentAppUser();

  if (!appUser) redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/lessons-v2/${slug}`)}`);
  if (!appUser.onboarding_completed) redirect("/onboarding");

  const lesson: LessonV2WithSteps | null = getSeedV2LessonBySlug(slug);

  if (!lesson) notFound();

  // Resume where the learner left off: jump to the first non-completed step,
  // or show the completion overlay if they've already finished the lesson.
  // A lookup failure falls back to step 0 via the resilient data layer.
  const progressMap = await getLessonV2Progress(slug);
  const firstIncomplete = lesson.steps.findIndex((step) => progressMap[step.id] !== "completed");
  const allCompleted = firstIncomplete === -1 && lesson.steps.length > 0;
  const initialStepIndex = allCompleted ? lesson.steps.length - 1 : Math.max(0, firstIncomplete);
  const supabase = await createServerSupabaseClient();
  const { data: accessibility } = await supabase
    .from("accessibility_settings")
    .select("font_scale, high_contrast, reduced_motion, audio_instructions, large_touch_targets, keyboard_navigation_hints")
    .eq("user_id", appUser.id)
    .maybeSingle();

  return (
    <main className="mx-auto flex h-[calc(100dvh-var(--global-command-bar-height,0px))] w-full max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6">
      <AppNav />
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <Link
            className="text-xs font-black uppercase text-black underline decoration-2 underline-offset-4"
            href="/lessons-v2"
          >
            ← Quay lại
          </Link>
          <h1 className="font-heading text-2xl text-black sm:text-3xl">{lesson.title}</h1>
        </div>
        <p className="text-xs font-semibold text-zinc-700">
          {lesson.stepCount} bước · ~{lesson.estimatedMinutes} phút · {lesson.learningGoals[0]}
        </p>
      </header>
      <div className="min-h-0 flex-1">
        <VoiceLessonClient
          lesson={lesson}
          initialStepIndex={initialStepIndex}
          initialAllCompleted={allCompleted}
          accessibilitySettings={accessibility ? {
            audioInstructions: Boolean(accessibility.audio_instructions),
            fontScale: accessibility.font_scale,
            highContrast: Boolean(accessibility.high_contrast),
            keyboardNavigationHints: Boolean(accessibility.keyboard_navigation_hints),
            largeTouchTargets: Boolean(accessibility.large_touch_targets),
            reducedMotion: Boolean(accessibility.reduced_motion),
          } : null}
        />
      </div>
    </main>
  );
}
