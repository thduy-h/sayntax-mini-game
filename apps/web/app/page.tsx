import type { Metadata } from "next";
import Link from "next/link";
import { listSeedV2Lessons } from "@shecancode/lesson-engine";
import { BrandLogo } from "@/components/brand-logo";

const lessons = listSeedV2Lessons();

export const metadata: Metadata = process.env.NEXT_PUBLIC_SITE_URL ? { alternates: { canonical: "/" } } : {};

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-5 sm:px-8 lg:px-12">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-4">
        <Link aria-label="SAYNTAX — trang chủ" href="/"><BrandLogo className="w-[162px] sm:w-[190px]" priority /></Link>
        <nav aria-label="Tài khoản" className="flex items-center gap-3 text-sm font-bold">
          <Link className="min-h-11 content-center underline underline-offset-4" href="/sign-in">Đăng nhập</Link>
          <Link className="inline-flex min-h-11 items-center rounded-lg border-2 border-black bg-white px-4 transition hover:bg-[#e7fff3]" href="/sign-up">Tạo tài khoản</Link>
        </nav>
      </header>

      <section className="grid items-stretch gap-5 py-7 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:py-12">
        <div className="flex flex-col items-start justify-center py-4 lg:py-8">
          <p className="inline-flex rounded-full border-2 border-black bg-[#e7fff3] px-4 py-1 text-xs font-black uppercase tracking-[0.14em]">Lập trình cho người mới bắt đầu</p>
          <h1 className="mt-6 max-w-3xl text-[clamp(2.8rem,5.4vw,5.4rem)] font-black leading-[0.98] tracking-[-0.055em]">Nói một câu.<br /><span className="text-[#d33364]">Xếp một khối.</span><br />Hiểu một ý.</h1>
          <p className="mt-6 max-w-xl text-base font-medium leading-7 text-zinc-800 sm:text-lg">SAYNTAX giúp bạn học lập trình bằng tiếng Việt. Nói, nhập lệnh hoặc kéo thả khối để hoàn thành từng bước nhỏ.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link className="inline-flex min-h-13 items-center rounded-xl border-2 border-black bg-[#ff5f87] px-7 py-3 text-base font-black shadow-[4px_4px_0_#121212] transition hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_#121212]" href="/demo">Học thử ngay →</Link>
            <span className="text-sm font-semibold text-zinc-700">Miễn phí · Không cần tài khoản</span>
          </div>
        </div>
        <div className="relative flex min-h-[390px] flex-col justify-center overflow-hidden rounded-[1.5rem] border-2 border-black bg-[#a8e6ff] p-5 shadow-[6px_6px_0_#121212] sm:p-8">
          <div className="absolute right-[-40px] top-[-45px] h-40 w-40 rotate-12 border-2 border-black bg-[#ffb84d]" aria-hidden="true" />
          <p className="relative text-xs font-black uppercase tracking-[0.2em]">Trong bài học đầu tiên</p>
          <div className="relative mt-7 max-w-[400px] space-y-3">
            <div className="w-fit rounded-lg border-2 border-black bg-white px-4 py-3 text-sm font-bold shadow-[3px_3px_0_#121212]">Bạn nói hoặc nhập: <span className="text-[#b72753]">“Thêm khối In”</span></div>
            <div className="ml-7 w-fit rounded-lg border-2 border-black bg-[#7df2c3] px-5 py-3 text-xl font-black shadow-[3px_3px_0_#121212]">in “Xin chào!”</div>
            <div className="ml-12 w-fit rounded-lg border-2 border-black bg-[#fffdf3] px-4 py-3 text-sm font-bold shadow-[3px_3px_0_#121212]">▶ Chạy → Xin chào!</div>
          </div>
          <p className="relative mt-8 max-w-sm text-sm font-semibold leading-6">Mỗi bước cho bạn biết cần làm gì. Kết quả hiện ngay để bạn hiểu điều vừa xảy ra.</p>
        </div>
      </section>

      <section aria-labelledby="ways-title" className="border-y-2 border-black py-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-2"><h2 className="text-2xl font-black tracking-tight sm:text-3xl" id="ways-title">Học theo cách của bạn</h2><p className="text-sm font-semibold">Ba cách thao tác · cùng một bài học</p></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {[
            ["01", "Nói tiếng Việt", "Nói câu lệnh ngắn như “Thêm khối In”."],
            ["02", "Nhập lệnh", "Gõ đúng câu mẫu khi bạn muốn dùng bàn phím."],
            ["03", "Kéo thả", "Chọn khối màu và xếp vào vùng làm bài."],
          ].map(([number, title, body]) => <div className="border-l-4 border-black pl-4" key={number}><p className="text-sm font-black text-[#a1284b]">{number}</p><h3 className="mt-2 text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-700">{body}</p></div>)}
        </div>
      </section>

      <section aria-labelledby="course-title" className="grid gap-8 py-10 lg:grid-cols-[0.7fr_1.3fr]">
        <div><p className="text-xs font-black uppercase tracking-[0.17em] text-[#a1284b]">Lộ trình đầu tiên</p><h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl" id="course-title">5 bài ngắn.<br />25 bước vừa sức.</h2><p className="mt-4 max-w-sm leading-7 text-zinc-700">Từ dòng chữ đầu tiên đến vòng lặp, điều kiện và biến. Bạn có thể bắt đầu với bài 1 ngay hôm nay.</p></div>
        <ol className="divide-y-2 divide-black border-y-2 border-black">
          {lessons.map((lesson) => <li key={lesson.id}><Link className="group flex min-h-16 items-center gap-4 py-3 transition hover:bg-white/60" href={`/demo/${lesson.slug}`}><span className="w-10 shrink-0 text-xl font-black text-[#a1284b]">{String(lesson.orderIndex).padStart(2, "0")}</span><span className="min-w-0 flex-1 font-black">{lesson.title}</span><span className="hidden text-sm font-semibold text-zinc-700 sm:block">{lesson.stepCount} bước</span><span className="text-xl font-black transition group-hover:translate-x-1">↗</span></Link></li>)}
        </ol>
      </section>
    </main>
  );
}
