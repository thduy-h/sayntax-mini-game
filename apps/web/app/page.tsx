import type { Metadata } from "next";
import Link from "next/link";
import { listSeedV2Lessons } from "@shecancode/lesson-engine";
import { Surface } from "@shecancode/ui";
import { BrandLogo } from "@/components/brand-logo";

const lessons = listSeedV2Lessons();
const totalSteps = lessons.reduce((sum, lesson) => sum + lesson.stepCount, 0);

export const metadata: Metadata = process.env.NEXT_PUBLIC_SITE_URL ? { alternates: { canonical: "/" } } : {};

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[80dvh] w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-10 lg:px-12">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="grid-sheen rounded-[2rem] border border-black/15 bg-[#fff6fb] p-5 shadow-sm sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-zinc-700">Dành cho người mới</span>
          </div>

          <div className="mt-6 space-y-4">
            <BrandLogo className="w-full max-w-[280px]" priority />
            <p className="font-heading text-base font-black uppercase tracking-[0.08em] text-black">Công nghệ không rào cản</p>
            <h1 className="font-heading max-w-5xl text-3xl leading-tight text-black sm:text-4xl lg:text-5xl">
              Học lập trình, từng bước dễ theo.
            </h1>
            <p className="max-w-3xl text-base font-medium leading-7 text-zinc-800 sm:text-lg sm:leading-8">
              Học lập trình bằng giọng nói tiếng Việt, nhập lệnh hoặc kéo thả Blockly. Bài học ngắn, hướng dẫn từng bước dành cho người mới.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#ff5f87] px-6 py-3 font-bold text-black transition hover:bg-[#ff7d9d] active:scale-[0.98]" href="/demo">Học thử</Link>
            <Link className="inline-flex min-h-12 items-center justify-center rounded-xl border border-black/20 bg-white px-5 py-3 font-bold text-black transition hover:bg-[#fff6fb]" href="/sign-up">Đăng ký</Link>
            <Link className="inline-flex min-h-12 items-center px-3 py-3 font-semibold text-zinc-700 underline-offset-4 hover:underline" href="/sign-in">Đăng nhập</Link>
          </div>
          <p className="mt-5 text-sm font-medium text-zinc-700">Học thử không cần tài khoản. Tiến độ demo chỉ lưu trên thiết bị này.</p>
        </div>

        <Surface className="flex flex-col justify-center bg-[#e7fff3] text-black">
          <h2 className="font-heading text-2xl leading-tight sm:text-3xl">Bắt đầu từ những điều cơ bản</h2>
          <p className="mt-4 leading-7 text-zinc-700">Từ chương trình đầu tiên đến vòng lặp, điều kiện và biến.</p>
          <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-black/10 py-6">
            <div><dt className="text-sm font-medium text-zinc-700">Bài học</dt><dd className="mt-2 text-4xl font-bold">{lessons.length}</dd></div>
            <div><dt className="text-sm font-medium text-zinc-700">Bước học</dt><dd className="mt-2 text-4xl font-bold">{totalSteps}</dd></div>
          </dl>
          <p className="mt-6 text-sm leading-6 text-zinc-700">Học thử miễn phí. Chọn cách thao tác phù hợp với bạn và bắt đầu ngay.</p>
        </Surface>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {[
          ["1", "Chọn bài học", "Mở một bài học ngắn với mục tiêu rõ ràng và câu mẫu tiếng Việt."],
          ["2", "Chọn cách thao tác", "Nói tiếng Việt, nhập câu lệnh hoặc kéo thả khối lệnh theo hướng dẫn."],
          ["3", "Xem khối lệnh và kết quả", "Chạy chương trình và xem phản hồi để biết bước tiếp theo."],
        ].map(([step, title, description]) => (
          <Surface className="bg-[#fffdf3]" key={step}>
            <p className="text-2xl font-bold text-[#9f2348]">{step}</p>
            <h2 className="font-heading mt-4 text-2xl text-black">{title}</h2>
            <p className="mt-3 text-sm font-medium leading-6 text-zinc-700">{description}</p>
          </Surface>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Surface className="bg-[#e7fff3]">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-black">Vì sao cần sản phẩm này?</p>
          <h2 className="font-heading mt-4 text-2xl leading-snug sm:text-3xl text-black">
            Khi thao tác tay là rào cản, giọng nói có thể trở thành cách học chủ động hơn.
          </h2>
          <p className="mt-4 text-base font-medium leading-7 text-zinc-800">
            Bài học ngắn, câu lệnh tiếng Việt và gợi ý từng bước giúp bạn bắt đầu theo nhịp của mình. Bạn luôn có thể dùng bàn phím để học.
          </p>
        </Surface>

        <Surface className="bg-[#fff6fb]">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-black">5 bài học đầu tiên</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {lessons.map((lesson) => (
              <Link
                className="rounded-[1rem] border border-black/15 bg-white p-4 text-black shadow-sm transition hover:border-[#9f2348] hover:bg-[#fff6fb]"
                href={`/demo/${lesson.slug}`}
                key={lesson.id}
              >
                <p className="text-xs font-black uppercase">Bài {lesson.orderIndex} · {lesson.stepCount} bước</p>
                <h3 className="mt-2 font-black">{lesson.title}</h3>
              </Link>
            ))}
          </div>
        </Surface>
      </section>
    </main>
  );
}
