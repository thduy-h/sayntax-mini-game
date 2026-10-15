"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[65dvh] max-w-2xl flex-col items-start justify-center gap-4 px-6 py-12 text-black">
      <h1 className="font-heading text-4xl">Trang tạm thời chưa sẵn sàng</h1>
      <p>Không thể tải nội dung lúc này. Hãy thử lại hoặc quay về trang chính.</p>
      <div className="flex flex-wrap gap-3">
        <button className="min-h-12 rounded-xl border-4 border-black bg-[#ffb84d] px-4 font-bold" onClick={reset} type="button">Thử lại</button>
        <Link className="inline-flex min-h-12 items-center rounded-xl border-4 border-black bg-white px-4 font-bold" href="/">Về trang chính</Link>
      </div>
    </main>
  );
}
