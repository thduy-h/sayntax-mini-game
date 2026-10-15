import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[80dvh] max-w-2xl flex-col items-center justify-center px-6 py-12 text-center text-black">
      <BrandLogo className="w-44 mb-8" priority />
      <div className="w-full rounded-3xl border-2 border-black bg-[#fffdf3] p-8 shadow-[6px_6px_0_#121212] sm:p-12">
        <div className="mx-auto inline-block rounded-2xl border-2 border-black bg-[#ffce47] px-6 py-2 shadow-[3px_3px_0_#121212]">
          <span className="font-heading text-4xl font-black tracking-wider text-black sm:text-5xl">
            404
          </span>
        </div>
        <h1 className="font-heading mt-6 text-2xl font-black text-black sm:text-3xl">
          Không tìm thấy trang này
        </h1>
        <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-700 sm:text-base">
          Liên kết bạn truy cập không tồn tại hoặc đã được cập nhật sang địa chỉ mới. Bạn có thể quay về trang chủ hoặc trải nghiệm ngay các bài học thử.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-black bg-[#7df2c3] px-6 py-2.5 text-sm font-black text-black shadow-[3px_3px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            href="/"
          >
            ← Về trang chủ
          </Link>
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-black bg-white px-6 py-2.5 text-sm font-black text-black shadow-[3px_3px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            href="/demo"
          >
            Học thử ngay
          </Link>
        </div>
      </div>
    </main>
  );
}
