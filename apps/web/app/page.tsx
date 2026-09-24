import Link from "next/link";
import { listSeedV2Lessons } from "@shecancode/lesson-engine";
import { Badge, Surface } from "@shecancode/ui";

const lessons = listSeedV2Lessons();
const totalSteps = lessons.reduce((sum, lesson) => sum + lesson.stepCount, 0);

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="grid-sheen rounded-[2rem] border-4 border-black bg-[#fff6fb] p-8 shadow-[10px_10px_0_#121212] sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>MVP demo</Badge>
            <span className="rounded-[0.9rem] border-4 border-black bg-[#ffb84d] px-3 py-1 text-sm font-extrabold uppercase shadow-[4px_4px_0_#121212]">
              Accessibility-first
            </span>
            <span className="rounded-[0.9rem] border-4 border-black bg-white px-3 py-1 text-sm font-extrabold uppercase shadow-[4px_4px_0_#121212]">
              Blockly + giọng nói
            </span>
          </div>

          <div className="mt-8 space-y-5">
            <p className="font-heading text-sm font-black uppercase tracking-[0.24em] text-black">SheCanCode Voice</p>
            <h1 className="font-heading max-w-5xl text-5xl leading-none text-black sm:text-6xl lg:text-7xl">
              Học lập trình block bằng giọng nói, từng bước nhỏ và dễ theo.
            </h1>
            <p className="max-w-3xl text-lg font-medium leading-8 text-zinc-800">
              Nhiều người khuyết tật vận động gặp khó khăn khi học lập trình bằng chuột và bàn phím. SheCanCode Voice giúp học sinh điều khiển Blockly bằng câu lệnh tiếng Việt, có gợi ý và phản hồi rõ ràng.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              className="inline-flex min-h-12 items-center rounded-[1rem] border-4 border-black bg-[#ff5f87] px-6 py-3 text-base font-extrabold uppercase text-black shadow-[6px_6px_0_#121212] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#121212]"
              href="/demo"
            >
              Trải nghiệm ngay — không cần đăng nhập
            </Link>
            <Link
              className="inline-flex min-h-12 items-center rounded-[1rem] border-4 border-black bg-[#7df2c3] px-6 py-3 text-base font-extrabold uppercase text-black shadow-[6px_6px_0_#121212] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#121212]"
              href="/sign-in"
            >
              Đăng nhập
            </Link>
          </div>
        </div>

        <Surface className="bg-[#121212] text-white">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7df2c3]">MVP hiện có</p>
          <div className="mt-6 grid gap-4">
            <div className="rounded-[1rem] border-4 border-white bg-[#ff5f87] p-4 text-black">
              <p className="text-xs font-black uppercase">Bài học</p>
              <p className="mt-2 text-5xl font-black leading-none">{lessons.length}</p>
            </div>
            <div className="rounded-[1rem] border-4 border-white bg-[#7df2c3] p-4 text-black">
              <p className="text-xs font-black uppercase">Bước học</p>
              <p className="mt-2 text-5xl font-black leading-none">{totalSteps}</p>
            </div>
            <div className="rounded-[1rem] border-4 border-white bg-white p-4 text-black">
              <p className="text-xs font-black uppercase">Demo công khai</p>
              <p className="mt-2 text-lg font-black">Không cần Supabase để mở `/demo`</p>
            </div>
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {[
          ["1", "Chọn bài học", "Mở một bài học ngắn với mục tiêu rõ ràng và câu mẫu tiếng Việt."],
          ["2", "Nói hoặc nhập câu lệnh", "Dùng micro khi có thể, hoặc nhập cùng câu lệnh khi micro không hoạt động."],
          ["3", "Xem khối lệnh và kết quả", "Blockly cập nhật block, chạy chương trình và phản hồi đúng/sai theo từng bước."],
        ].map(([step, title, description]) => (
          <Surface className="bg-[#fffdf3]" key={step}>
            <p className="text-5xl font-black text-[#ff5f87]">{step}</p>
            <h2 className="font-heading mt-4 text-3xl text-black">{title}</h2>
            <p className="mt-3 text-sm font-medium leading-6 text-zinc-700">{description}</p>
          </Surface>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Surface className="bg-[#e7fff3]">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-black">Vì sao cần sản phẩm này?</p>
          <h2 className="font-heading mt-4 text-4xl leading-none text-black">
            Khi thao tác tay là rào cản, giọng nói có thể trở thành cách học chủ động hơn.
          </h2>
          <p className="mt-4 text-base font-medium leading-7 text-zinc-800">
            Sản phẩm không cố thay giáo viên. MVP tập trung vào bài học nhỏ, phản hồi tức thì, và cách điều khiển block thân thiện cho live demo.
          </p>
        </Surface>

        <Surface className="bg-[#fff6fb]">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-black">5 bài học đầu tiên</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {lessons.map((lesson) => (
              <Link
                className="rounded-[1rem] border-4 border-black bg-white p-4 text-black shadow-[5px_5px_0_#121212] transition hover:-translate-y-1"
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
