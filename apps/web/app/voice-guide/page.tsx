import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { DetailedVoiceGuide } from "@/features/voice-control/components/detailed-voice-guide";

export const metadata: Metadata = {
  title: "Hướng dẫn điều khiển giọng nói chi tiết — SAYNTAX",
  description:
    "Bảng câu lệnh đầy đủ hỗ trợ học viên và người đồng hành làm chủ SAYNTAX bằng giọng nói tiếng Việt.",
};

export default function VoiceGuidePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Top Navigation */}
      <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-black bg-white px-4 sm:px-5 py-2 sm:py-2.5 shadow-[3px_3px_0_#121212]">
        <Link aria-label="SAYNTAX - Trang chủ" className="flex items-center" href="/">
          <BrandLogo className="w-[155px] sm:w-[175px]" priority />
        </Link>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            className="inline-flex items-center rounded-xl border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            href="/"
          >
            ← Về Trang chủ
          </Link>
          <Link
            className="inline-flex items-center rounded-xl border-2 border-black bg-[#ff5f87] px-3.5 py-1.5 text-xs font-black uppercase tracking-wide text-black shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            href="/demo"
          >
            Học thử ngay →
          </Link>
        </div>
      </nav>

      {/* Breadcrumb / Notice */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-zinc-700">
        <div className="flex items-center gap-1.5">
          <Link href="/" className="hover:underline text-black font-black">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-zinc-500">Hướng dẫn giọng nói</span>
        </div>
        <div className="text-[11px] text-zinc-600">
          🎙️ Nói: <span className="font-mono font-black text-black">&ldquo;Trang chủ&rdquo;</span> hoặc{" "}
          <span className="font-mono font-black text-black">&ldquo;Học thử&rdquo;</span> để điều hướng
        </div>
      </div>

      {/* Full 7-group Detailed Voice Guide */}
      <DetailedVoiceGuide />
    </main>
  );
}
