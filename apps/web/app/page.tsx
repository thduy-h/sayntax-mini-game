import Link from "next/link";
import { countWorkspaceBlocks, createEmptyProgram } from "@shecancode/block-engine";
import { getSeedCourseOverview, listSeedLessons } from "@shecancode/lesson-engine";
import { roleLabels } from "@shecancode/shared-types";
import { Badge, Surface } from "@shecancode/ui";
import { SUPPORTED_COMMAND_PATTERNS } from "@shecancode/voice-parser";

const course = getSeedCourseOverview();
const lessons = listSeedLessons();
const roles = Object.values(roleLabels);
const workspaceBlockCount = countWorkspaceBlocks(createEmptyProgram());

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid-sheen rounded-[2rem] border-4 border-black bg-[#fff6fb] p-8 shadow-[10px_10px_0_#121212] sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>MVP v1</Badge>
            <span className="rounded-[0.9rem] border-4 border-black bg-[#ffb84d] px-3 py-1 text-sm font-extrabold uppercase shadow-[4px_4px_0_#121212]">
              Accessibility First
            </span>
            <span className="rounded-[0.9rem] border-4 border-black bg-white px-3 py-1 text-sm font-extrabold uppercase shadow-[4px_4px_0_#121212]">
              Scratch Inspired
            </span>
          </div>

          <div className="mt-8 space-y-5">
            <p className="font-heading text-sm font-black uppercase tracking-[0.24em] text-black">SheCanCode Voice</p>
            <h1 className="font-heading max-w-5xl text-5xl leading-none text-black sm:text-6xl lg:text-7xl">
              Học lập trình bằng block, giọng nói và các bước nhỏ đủ rõ để ai cũng có thể bắt đầu.
            </h1>
            <p className="max-w-3xl text-lg font-medium leading-8 text-zinc-800">
              Nền tảng này dành cho nữ sinh có khuyết tật vận động, tập trung vào bài học có hướng dẫn, workspace block đơn
              giản và trải nghiệm đủ tự tin để tiếp tục học công nghệ.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              className="inline-flex min-h-12 items-center rounded-[1rem] border-4 border-black bg-[#ff5f87] px-6 py-3 text-base font-extrabold uppercase text-black shadow-[6px_6px_0_#121212] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#121212]"
              href="/sign-up"
            >
              Tạo tài khoản
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
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7df2c3]">Tổng quan</p>
          <div className="mt-6 grid gap-4">
            <div className="rounded-[1rem] border-4 border-white bg-[#ff5f87] p-4 text-black">
              <p className="text-xs font-black uppercase">Khóa học</p>
              <p className="mt-2 text-3xl font-black leading-none">{course.title}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1rem] border-4 border-white bg-[#fff6fb] p-4 text-black">
                <p className="text-xs font-black uppercase">Bài học</p>
                <p className="mt-2 text-4xl font-black leading-none">{course.lessonCount}</p>
              </div>
              <div className="rounded-[1rem] border-4 border-white bg-[#7df2c3] p-4 text-black">
                <p className="text-xs font-black uppercase">Lệnh giọng nói</p>
                <p className="mt-2 text-4xl font-black leading-none">{SUPPORTED_COMMAND_PATTERNS.length}</p>
              </div>
              <div className="rounded-[1rem] border-4 border-white bg-[#ffb84d] p-4 text-black">
                <p className="text-xs font-black uppercase">Vai trò</p>
                <p className="mt-2 text-lg font-black">{roles.join(" + ")}</p>
              </div>
              <div className="rounded-[1rem] border-4 border-white bg-white p-4 text-black">
                <p className="text-xs font-black uppercase">Workspace mẫu</p>
                <p className="mt-2 text-4xl font-black leading-none">{workspaceBlockCount}</p>
              </div>
            </div>
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Surface className="bg-[#fffdf3]">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-black">Kiến trúc đang có</p>
          <h2 className="font-heading mt-4 max-w-3xl text-4xl leading-none text-black">
            Monorepo gọn, tách rõ block engine, lesson engine và voice parser để đi tiếp nhanh hơn.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              "apps/web cho giao diện, route handler và server actions",
              "packages dùng chung cho UI, types, lesson engine và voice parser",
              "supabase cho migrations, seed data và auth",
              "docs cho product spec, user flows và API contracts",
            ].map((item, index) => (
              <div
                key={item}
                className={`rounded-[1rem] border-4 border-black p-5 text-base font-semibold text-black shadow-[6px_6px_0_#121212] ${
                  index % 2 === 0 ? "bg-[#fff6fb]" : "bg-[#e7fff3]"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="bg-[#fff6fb]">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-black">5 bài học đầu tiên</p>
          <div className="mt-6 space-y-4">
            {lessons.map((lesson, index) => (
              <div
                key={lesson.id}
                className={`rounded-[1rem] border-4 border-black p-4 shadow-[6px_6px_0_#121212] ${
                  index % 2 === 0 ? "bg-white" : "bg-[#ffefb8]"
                }`}
              >
                <p className="text-xs font-black uppercase text-black">
                  Bài {lesson.orderIndex} • {lesson.stepCount} bước
                </p>
                <h3 className="mt-2 text-xl font-black uppercase text-black">{lesson.title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-zinc-700">{lesson.summary}</p>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Surface className="bg-[#121212] text-white">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb84d]">Mốc gần nhất</p>
          <ul className="mt-6 space-y-4">
            {[
              "Xác thực và onboarding đã chạy bằng Supabase",
              "Blockly workspace đã có program runner và lesson completion",
              "Speech to text tiếng Việt đã nối vào parser rule-based",
              "Tiến độ và voice logs đã lưu xuống database",
            ].map((item) => (
              <li key={item} className="rounded-[1rem] border-4 border-white bg-white p-4 font-semibold text-black shadow-[6px_6px_0_#ff5f87]">
                {item}
              </li>
            ))}
          </ul>
        </Surface>

        <Surface className="bg-[#e7fff3]">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-black">Lệnh tiếng Việt đang hỗ trợ</p>
          <h2 className="font-heading mt-4 text-4xl leading-none text-black">Web Speech API + parser rule-based cho các câu lệnh ngắn, rõ, dễ học.</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {SUPPORTED_COMMAND_PATTERNS.slice(0, 6).map((command, index) => (
              <div
                key={command}
                className={`rounded-[1rem] border-4 border-black px-4 py-3 text-sm font-black uppercase text-black shadow-[6px_6px_0_#121212] ${
                  index % 2 === 0 ? "bg-[#ffb84d]" : "bg-white"
                }`}
              >
                {command}
              </div>
            ))}
          </div>
        </Surface>
      </section>
    </main>
  );
}
