import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeedV2LessonBySlug, type LessonV2WithSteps } from "@shecancode/lesson-engine";
import { BrandLogo } from "@/components/brand-logo";
import { VoiceLessonClient } from "@/features/lesson-v2/components/voice-lesson-client";

interface DemoLessonPageProps {
  params: Promise<{ slug: string }>;
}

export default async function DemoLessonPage({ params }: DemoLessonPageProps) {
  const { slug } = await params;
  const lesson: LessonV2WithSteps | null = getSeedV2LessonBySlug(slug);

  if (!lesson) notFound();

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-var(--global-command-bar-height,0px))] w-full max-w-[1600px] min-w-0 flex-col gap-3 px-3 py-3 sm:px-6 lg:h-[calc(100dvh-var(--global-command-bar-height,0px))]">
      <nav className="flex flex-wrap items-center justify-between gap-2 rounded-[1.2rem] border-4 border-black bg-white px-3 py-2 shadow-[6px_6px_0_#121212] sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-3">
          <BrandLogo className="w-[120px]" />
          <Link className="text-xs font-black uppercase text-black underline decoration-2 underline-offset-4" href="/demo">
            ← Danh sách demo
          </Link>
          <h1 className="font-heading min-w-0 break-words text-xl text-black sm:text-3xl">{lesson.title}</h1>
        </div>
        <p className="hidden rounded border-2 border-black bg-[#e7fff3] px-3 py-1 text-xs font-black uppercase text-black sm:block">
          Chế độ demo — lưu trên thiết bị này
        </p>
      </nav>
      <div className="min-h-0 min-w-0 flex-1">
        <VoiceLessonClient
          lesson={lesson}
          mode="demo"
          accessibilitySettings={{
            audioInstructions: false,
            fontScale: "default",
            highContrast: false,
            keyboardNavigationHints: false,
            largeTouchTargets: true,
            reducedMotion: false,
          }}
        />
      </div>
    </main>
  );
}
