import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = { title: "Quyền riêng tư — SAYNTAX" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-[75dvh] w-full max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link aria-label="SAYNTAX — Trang chủ" href="/">
          <BrandLogo className="w-40 sm:w-48" priority />
        </Link>
        <Link
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-black bg-white px-3.5 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0_#121212] transition-transform hover:-translate-y-0.5 active:translate-y-0"
          href="/"
        >
          ← Về SAYNTAX
        </Link>
      </div>

      <article className="space-y-8 rounded-3xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_#121212] sm:p-10">
        <div>
          <span className="rounded-md border border-black bg-[#ffce47] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212]">
            Chính sách bảo mật
          </span>
          <h1 className="font-heading mt-3 text-3xl font-black text-black sm:text-4xl">
            Quyền riêng tư & Dữ liệu
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-600">
            Cam kết minh bạch về cách SAYNTAX xử lý dữ liệu giọng nói, câu lệnh và tiến độ học tập.
          </p>
        </div>

        <section className="space-y-2 rounded-2xl border-2 border-black bg-[#fff6fb] p-5 shadow-[3px_3px_0_#121212]">
          <h2 className="font-heading text-lg font-black text-black sm:text-xl">
            1. Tài khoản và tiến độ học tập
          </h2>
          <p className="text-sm font-medium leading-relaxed text-zinc-800">
            SAYNTAX lưu tài khoản, thiết lập ban đầu và tiến độ học khi bạn đăng nhập. Bản học thử không cần tài khoản; tiến độ demo chỉ được lưu trên thiết bị đang dùng.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border-2 border-black bg-[#e7fff3] p-5 shadow-[3px_3px_0_#121212]">
          <h2 className="font-heading text-lg font-black text-black sm:text-xl">
            2. Giọng nói và câu lệnh
          </h2>
          <p className="text-sm font-medium leading-relaxed text-zinc-800">
            Âm thanh có thể được gửi tới nhà cung cấp nhận dạng trên đám mây. Dịch vụ nhận dạng dự phòng của trình duyệt có thể xử lý âm thanh theo chính sách của nhà cung cấp trình duyệt. Workshop dùng nhận dạng trên máy vận hành. SAYNTAX không giữ lại âm thanh thô sau khi xử lý.
          </p>
          <p className="text-sm font-medium leading-relaxed text-zinc-800">
            Trong bài học, lưu câu lệnh đã nhận dạng hoặc nhập vào là lựa chọn riêng, mặc định tắt. Demo không gửi nhật ký câu lệnh, tiến độ hoặc lần chạy chương trình lên máy chủ.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border-2 border-black bg-[#fffdf3] p-5 shadow-[3px_3px_0_#121212]">
          <h2 className="font-heading text-lg font-black text-black sm:text-xl">
            3. Quyền lựa chọn của bạn
          </h2>
          <p className="text-sm font-medium leading-relaxed text-zinc-800">
            Bạn luôn có thể nhập lệnh thay vì dùng micro. Bạn có thể đặt lại tiến độ demo trên thiết bị trong giao diện bài học. Với dữ liệu tài khoản, hãy liên hệ người phụ trách chương trình để yêu cầu bản sao hoặc xóa dữ liệu.
          </p>
        </section>
      </article>
    </main>
  );
}
