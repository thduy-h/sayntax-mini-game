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
    <main className="scc-lesson-page mx-auto flex min-h-[calc(100dvh-var(--global-command-bar-height,0px))] w-full max-w-[1600px] min-w-0 flex-col gap-3 px-3 py-3 sm:px-6">
      <nav className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border-2 sm:border-[2.5px] border-black bg-white px-3.5 py-2.5 shadow-[3px_3px_0_#121212] sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
          <Link aria-label="SAYNTAX - về trang chủ" className="inline-flex shrink-0 items-center" href="/">
            <BrandLogo className="w-[105px] sm:w-[130px]" />
          </Link>
          <div className="hidden h-5 w-px bg-black/20 sm:block" />
          <Link className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-[#fffdf3] px-2.5 py-1 text-xs font-black uppercase text-black shadow-[2px_2px_0_#121212] hover:bg-[#fff0a8] hover:translate-x-0.5 hover:translate-y-0.5 transition-all" href="/demo">
            ← Danh sách demo
          </Link>
          <div className="hidden sm:flex items-center gap-2">
            <span className="rounded bg-[#a8e6ff] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black border border-black/30">Bài {lesson.orderIndex}</span>
            <h1 className="font-heading min-w-0 truncate text-base font-black text-black lg:text-lg">{lesson.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="rounded-lg border-2 border-black bg-[#e7fff3] px-2.5 py-1 text-[11px] sm:text-xs font-black uppercase text-black shadow-[2px_2px_0_#121212]">
            Chế độ demo — lưu trên thiết bị này
          </p>
        </div>
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
