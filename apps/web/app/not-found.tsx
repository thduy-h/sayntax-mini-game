import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[65dvh] max-w-2xl flex-col items-start justify-center gap-4 px-6 py-12 text-black">
      <p className="rounded-full border-2 border-black bg-[#ffb84d] px-4 py-1 text-sm font-black">404 · LẠC ĐƯỜNG RỒI</p>
      <h1 className="font-heading text-4xl font-black sm:text-5xl">Không tìm thấy trang</h1>
      <p>Liên kết có thể đã thay đổi. Bạn có thể quay về trang chính hoặc mở danh sách bài học thử.</p>
      <div className="flex flex-wrap gap-3">
        <Link className="inline-flex min-h-12 items-center rounded-xl border-4 border-black bg-[#7df2c3] px-4 font-bold" href="/">Về trang chính</Link>
        <Link className="inline-flex min-h-12 items-center rounded-xl border-4 border-black bg-white px-4 font-bold" href="/demo">Học thử</Link>
      </div>
    </main>
  );
}
