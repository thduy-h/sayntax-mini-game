import type { LessonPrimer } from "../utils/lesson-primer";
import { PrimerIllustration } from "./primer-illustration";

export function KnowledgePrimerContent({ primer }: { primer: LessonPrimer }) {
  if (!primer.sections) {
    return (
      <div className="@container/primer space-y-6 text-base leading-7" data-primer-teaching-content>
        <dl className="space-y-5">
          <div><dt className="text-xl font-black text-black">Khái niệm</dt><dd className="mt-2 text-zinc-800">{primer.concept}</dd></div>
          <div><dt className="text-lg font-black text-black">Dùng để làm gì?</dt><dd className="mt-2 text-zinc-800">{primer.purpose}</dd></div>
          <div className="border-l-4 border-[#0e6245] bg-[#e7fff3] px-4 py-3"><dt className="font-bold text-black">Ví dụ</dt><dd className="mt-1 whitespace-pre-line text-zinc-800">{primer.example}</dd></div>
        </dl>
        {primer.visual && <PrimerIllustration kind={primer.visual} />}
        {primer.takeaway && <Takeaway>{primer.takeaway}</Takeaway>}
        <dl><dt className="text-lg font-black text-black">Liên hệ bài thực hành</dt><dd className="mt-2 text-zinc-800">{primer.goal}</dd></dl>
      </div>
    );
  }

  return (
    <div className="@container/primer space-y-8 text-base leading-7 text-zinc-800" data-primer-teaching-content>
      {primer.sections.map((section, index) => (
        <section key={section.id} aria-labelledby={`primer-${section.id}`} className="space-y-5 border-t-2 border-black/15 pt-6">
          <h3 id={`primer-${section.id}`} className="text-xl font-black leading-snug text-black sm:text-2xl">
            {index + 1}. {section.title}
          </h3>
          {section.visual === "program" ? (
            <>
              <p>{section.explanation[0]}</p>
              <div className="grid items-start gap-5 @[44rem]/primer:grid-cols-2">
                <PrimerIllustration kind="program" />
                <div className="space-y-4">
                  {section.explanation.slice(1).map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                  <Example>{section.example}</Example>
                </div>
              </div>
            </>
          ) : (
            <div className={section.visual === "block" || section.visual === "roles" ? "grid items-start gap-5 @[44rem]/primer:grid-cols-2" : "space-y-5"}>
              <div className="space-y-4">
                {section.explanation.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                <Example>{section.example}</Example>
              </div>
              {section.visual && <PrimerIllustration kind={section.visual} />}
            </div>
          )}
          {section.program && (
            <figure className="rounded-xl border-2 border-black bg-[#f0f6ff] p-4 shadow-[3px_3px_0_#121212] sm:p-5">
              <figcaption className="font-black text-black">Chương trình minh họa và kết quả dự kiến sau khi chạy</figcaption>
              <div className="mt-4 grid gap-5 @[36rem]/primer:grid-cols-2">
                <div>
                  <p className="mb-2 font-bold text-black">Chuỗi khối (đọc từ trên xuống)</p>
                  <ol className="space-y-2 font-mono font-bold text-black">
                    {section.program.blocks.map((block, blockIndex) => (
                      <li key={block}>
                        {blockIndex > 0 && <span aria-hidden="true" className="mb-2 block pl-4">↓</span>}
                        <span className={`block rounded-lg border-2 border-black px-3 py-2 ${blockIndex === 0 ? "bg-[#ffce47]" : "bg-white"}`}>{block}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <p className="mb-2 font-bold text-black">Đầu ra trong vùng kết quả</p>
                  <pre className="whitespace-pre-wrap break-words rounded-lg border-2 border-black bg-white px-3 py-2 font-mono text-base text-black">{section.program.output.join("\n")}</pre>
                </div>
              </div>
            </figure>
          )}
          {section.steps && (
            <ol className="list-decimal space-y-5 pl-6 marker:font-black marker:text-black">
              {section.steps.map((step) => (
                <li key={step.task} className="pl-1">
                  <p className="font-black text-black">{step.task}</p>
                  <p>Giọng nói: <q className="font-mono font-bold text-black">{step.voice}</q>.</p>
                  <p>Kéo thả: {step.drag}</p>
                </li>
              ))}
            </ol>
          )}
          {section.takeaway && <Takeaway>{section.takeaway}</Takeaway>}
          <p className="text-base leading-7"><strong className="text-black">Liên hệ thực hành: </strong>{section.practice}</p>
        </section>
      ))}
    </div>
  );
}

function Takeaway({ children }: { children: React.ReactNode }) {
  return (
    <aside className="border-l-4 border-[#b78b00] bg-[#fff5cc] px-4 py-3" aria-label="Điều cần nhớ">
      <p className="text-sm font-black uppercase tracking-wide text-black">Điều cần nhớ</p>
      <p className="mt-1 text-base leading-7 text-zinc-800">{children}</p>
    </aside>
  );
}

function Example({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-l-4 border-[#0e6245] bg-[#e7fff3] px-4 py-3">
      <strong className="text-black">Ví dụ: </strong>{children}
    </p>
  );
}
