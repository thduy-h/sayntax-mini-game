import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Quyền riêng tư" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-[70dvh] w-full max-w-3xl px-6 py-10 sm:px-10">
      <Link className="inline-flex min-h-11 items-center font-bold underline underline-offset-4" href="/">← Về SAYNTAX</Link>
      <article className="mt-4 space-y-6 rounded-3xl border border-black/15 bg-white p-5 leading-7 text-zinc-800 shadow-sm sm:p-8">
        <h1 className="font-heading text-3xl sm:text-4xl">Quyền riêng tư</h1>
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Tài khoản và tiến độ</h2>
          <p>SAYNTAX lưu tài khoản, thiết lập ban đầu và tiến độ học khi bạn đăng nhập. Bản học thử không cần tài khoản; tiến độ demo chỉ được lưu trên thiết bị đang dùng.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Giọng nói và câu lệnh</h2>
          <p>Âm thanh có thể được gửi tới nhà cung cấp nhận dạng trên đám mây. Dịch vụ nhận dạng dự phòng của trình duyệt có thể xử lý âm thanh theo chính sách của nhà cung cấp trình duyệt. Workshop dùng nhận dạng trên máy vận hành. SAYNTAX không giữ lại âm thanh thô sau khi xử lý.</p>
          <p>Trong bài học, lưu câu lệnh đã nhận dạng hoặc nhập vào là lựa chọn riêng, mặc định tắt. Demo không gửi nhật ký câu lệnh, tiến độ hoặc lần chạy chương trình lên máy chủ.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Lựa chọn của bạn</h2>
          <p>Bạn luôn có thể nhập lệnh thay vì dùng micro. Bạn có thể đặt lại tiến độ demo trên thiết bị trong giao diện bài học. Với dữ liệu tài khoản, hãy liên hệ người phụ trách chương trình để yêu cầu bản sao hoặc xóa dữ liệu.</p>
        </section>
      </article>
    </main>
  );
}
