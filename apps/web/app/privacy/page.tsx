import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Quyền riêng tư" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-[70dvh] w-full max-w-3xl px-6 py-10 sm:px-10">
      <Link className="inline-flex min-h-11 items-center font-bold underline underline-offset-4" href="/">← Về SAYNTAX</Link>
      <article className="mt-4 space-y-6 rounded-2xl border-2 border-black bg-white p-5 leading-7 text-zinc-800 shadow-[4px_4px_0_#121212] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.17em] text-[#a1284b]">Thông tin rõ ràng cho bạn</p>
        <h1 className="font-heading text-3xl font-black sm:text-4xl">Quyền riêng tư</h1>
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Tài khoản và tiến độ</h2>
          <p>SAYNTAX lưu tài khoản, thiết lập ban đầu và tiến độ học khi bạn đăng nhập. Bản học thử không cần tài khoản; tiến độ demo chỉ được lưu trên thiết bị đang dùng.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Giọng nói và câu lệnh</h2>
          <p>Âm thanh có thể được gửi tới dịch vụ nhận dạng trên đám mây. Trình duyệt cũng có thể xử lý âm thanh theo chính sách của nhà cung cấp. Trong một số buổi học, âm thanh được xử lý trên máy của lớp. SAYNTAX không giữ lại âm thanh thô sau khi xử lý.</p>
          <p>Trong bài học, việc lưu câu lệnh đã nói hoặc nhập là lựa chọn riêng và mặc định tắt. Bản học thử không gửi câu lệnh, tiến độ hoặc kết quả chạy lên máy chủ.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Lựa chọn của bạn</h2>
          <p>Bạn luôn có thể nhập lệnh thay vì dùng micro. Bạn có thể đặt lại tiến độ demo trên thiết bị trong giao diện bài học. Với dữ liệu tài khoản, hãy liên hệ người phụ trách chương trình để yêu cầu bản sao hoặc xóa dữ liệu.</p>
        </section>
      </article>
    </main>
  );
}
