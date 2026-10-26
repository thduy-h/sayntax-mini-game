import Link from "next/link";

/** Static quick start: no microphone, progress state or onboarding workflow. */
export function FirstTimeGuidance() {
  return (
    <section
      id="landing-guidance"
      aria-labelledby="landing-guidance-title"
      className="flex flex-col gap-5 rounded-3xl border-2 border-black bg-[#fffdf0] p-6 shadow-[4px_4px_0_#121212] sm:p-7"
    >
      <header>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-600">Làm quen với SAYNTAX</p>
        <h2 id="landing-guidance-title" className="font-heading mt-2 text-2xl font-black leading-snug tracking-tight text-black">
          Bắt đầu với giọng nói
        </h2>
        <p className="mt-3 text-base leading-relaxed text-zinc-800">
          Bạn có thể nói để điều khiển nhiều chức năng của SAYNTAX mà không cần sử dụng chuột liên tục.
        </p>
      </header>

      <div className="border-l-4 border-[#0052cc] pl-4">
        <h3 className="font-bold text-black">SAYNTAX có đang nghe không?</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-700">
          Xem trạng thái ở <strong className="text-black">góc dưới bên phải</strong>: SAYNTAX có đang nghe, vừa nhận được câu gì và thao tác đã thành công hay chưa.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-bold text-zinc-700">Khi micro đang nghe, bạn có thể thử nói:</h3>
        <dl className="mt-3 space-y-3">
          {[
            { cmd: "Học thử", desc: "Mở danh sách bài học", color: "bg-[#e7fff3]" },
            { cmd: "Trợ giúp", desc: "Mở trang hướng dẫn", color: "bg-[#f0f6ff]" },
          ].map(({ cmd, desc, color }) => (
            <div key={cmd} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <dt className={`rounded-md border border-black px-2.5 py-1 font-mono text-sm font-black text-black ${color}`}>
                “{cmd}”
              </dt>
              <dd className="text-sm text-zinc-700">— {desc}</dd>
            </div>
          ))}
        </dl>
      </div>

      <footer className="border-t border-black/15 pt-4 text-sm leading-relaxed">
        <p className="mb-2 text-zinc-700">Bạn cũng có thể học bằng kéo thả, không cần bật micro.</p>
        <Link href="/voice-guide" className="inline-flex min-h-11 items-center font-bold text-black underline underline-offset-4 transition-colors hover:text-[#9f2348] focus-visible:outline-4 focus-visible:outline-[#0052cc]">
          Xem tất cả câu lệnh hỗ trợ →
        </Link>
      </footer>
    </section>
  );
}
