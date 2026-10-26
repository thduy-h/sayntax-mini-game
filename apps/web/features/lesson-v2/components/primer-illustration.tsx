import type { ReactNode } from "react";
import type { PrimerVisual } from "../utils/lesson-primer";

function Arrow() {
  return <span aria-hidden="true" className="self-center rotate-90 text-xl @sm/diagram:rotate-0 font-black text-zinc-500">→</span>;
}

function Flow({ children, label }: { children: ReactNode; label: string }) {
  return <div role="group" aria-label={label} className="flex flex-col items-stretch gap-2 @sm/diagram:flex-row">{children}</div>;
}

function Node({ title, detail, color = "bg-white" }: { title: string; detail?: string; color?: string }) {
  return (
    <div className={`min-w-0 flex-1 basis-auto @sm/diagram:basis-28 rounded-lg border-2 border-black px-3 py-2.5 ${color}`}>
      <p className="break-words font-bold leading-snug text-black">{title}</p>
      {detail && <p className="mt-1 text-sm leading-relaxed text-zinc-700">{detail}</p>}
    </div>
  );
}

/** Schematic learning diagrams, not interactive Blockly blocks or workspace state. */
export function PrimerIllustration({ kind }: { kind: PrimerVisual }) {
  const frame = "@container/diagram space-y-4 rounded-xl border-2 border-black bg-[#f0f6ff] p-4 text-base leading-relaxed sm:p-5";
  if (kind === "program") return (
    <figure className={frame} data-primer-illustration={kind}>
      <figcaption className="font-black text-black">Từ việc quen thuộc đến chỉ dẫn cho máy tính</figcaption>
      <div className="space-y-2">
        <p className="text-sm font-bold text-zinc-700">Ví dụ đời thường: chuẩn bị một cốc nước</p>
        <Flow label="Thứ tự hành động"><Node title="Lấy cốc" /><Arrow /><Node title="Rót nước" /><Arrow /><Node title="Khuấy đều" /></Flow>
        <p className="text-sm text-zinc-700">Mỗi hành động là một chỉ dẫn. Thứ tự thực hiện giúp chúng ta đạt kết quả mong muốn.</p>
      </div>
      <div className="space-y-2 border-t border-black/20 pt-4">
        <p className="text-sm font-bold text-zinc-700">Trong SAYNTAX: tạo chỉ dẫn, rồi chạy để xem kết quả</p>
        <Flow label="Chương trình và kết quả sau khi chạy">
          <Node title="Bắt đầu" detail="Điểm khởi động" color="bg-[#fff0a8]" /><Arrow />
          <Node title={'In “Xin chào”'} detail="Lệnh hiển thị chữ" color="bg-[#e7fff3]" /><Arrow />
          <Node title="Kết quả: Xin chào" detail="Đầu ra sau khi chạy" />
        </Flow>
        <p className="text-sm text-zinc-700">Hai ô đầu mô tả chương trình; ô Kết quả là điều xuất hiện sau khi chạy, không phải một khối lệnh.</p>
      </div>
    </figure>
  );
  if (kind === "block") return (
    <figure className={frame} data-primer-illustration={kind}>
      <figcaption className="font-black text-black">Đọc một khối In</figcaption>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-black bg-[#e7fff3] p-3 font-mono font-bold text-black">
        <span>In</span><span className="min-w-0 rounded border border-black bg-white px-3 py-1">Xin chào</span>
      </div>
      <dl className="grid gap-3 text-sm @md/diagram:grid-cols-2">
        <div><dt className="font-bold text-black">In → hành động</dt><dd>Yêu cầu hiển thị nội dung.</dd></div>
        <div><dt className="font-bold text-black">Xin chào → nội dung</dt><dd>Ô chữ bạn có thể thay đổi.</dd></div>
      </dl>
      <p className="text-sm text-zinc-700">Sơ đồ giúp đọc tên và ô nội dung; đây không phải khối có thể kéo thả.</p>
    </figure>
  );
  if (kind === "roles") return (
    <figure className={frame} data-primer-illustration={kind}>
      <figcaption className="font-black text-black">Mỗi khối đảm nhiệm một việc</figcaption>
      <dl className="space-y-3">
        <div className="border-l-4 border-[#b78b00] pl-3"><dt className="font-black text-black">Bắt đầu</dt><dd>Đánh dấu điểm khởi động; tự nó chưa hiển thị dòng chữ nào.</dd></div>
        <div className="border-l-4 border-[#0e6245] pl-3"><dt className="font-black text-black">In “Xin chào”</dt><dd>Yêu cầu hiển thị lời chào trong vùng kết quả, không in ra giấy.</dd></div>
      </dl>
    </figure>
  );
  if (kind === "sequence" || kind === "output-order") {
    const second = kind === "sequence" ? "Hẹn gặp lại" : "Bạn làm được!";
    return (
      <figure className={frame} data-primer-illustration={kind}>
        <figcaption className="font-black text-black">Đọc thứ tự khối, đối chiếu thứ tự đầu ra</figcaption>
        <div className="grid gap-4 @md/diagram:grid-cols-2">
          <div><p className="mb-2 text-sm font-bold">Chuỗi lệnh sau Bắt đầu</p><ol className="space-y-2 border-l-4 border-[#0e6245] pl-3 font-mono text-black"><li>1. In “Xin chào”</li><li>2. In “{second}”</li></ol></div>
          <div><p className="mb-2 text-sm font-bold">Kết quả sau khi chạy</p><pre className="whitespace-pre-wrap rounded-lg border border-black bg-white p-3 font-mono text-base text-black">{`Xin chào\n${second}`}</pre></div>
        </div>
        <p className="text-sm text-zinc-700">Đổi thứ tự hai lệnh In thì thứ tự hai dòng cũng đổi.</p>
      </figure>
    );
  }
  if (kind === "create-run") return (
    <figure className={frame} data-primer-illustration={kind}>
      <figcaption className="font-black text-black">Từ chỉ dẫn đến kết quả</figcaption>
      <Flow label="Tạo, chạy và quan sát">
        <Node title="Tạo" detail="Thêm khối · sửa chữ · kết nối" color="bg-[#fff0a8]" /><Arrow />
        <Node title="Chạy" detail="Máy tính thực hiện chỉ dẫn" color="bg-[#e7fff3]" /><Arrow />
        <Node title="Quan sát" detail="Đọc kết quả, sửa rồi chạy lại nếu cần" />
      </Flow>
    </figure>
  );
  if (kind === "repeat") return (
    <figure className={frame} data-primer-illustration={kind}>
      <figcaption className="font-black text-black">Một lệnh bên trong, ba lần thực hiện</figcaption>
      <div className="grid gap-4 @md/diagram:grid-cols-2">
        <div className="rounded-lg border-2 border-black bg-[#fff0a8] p-3"><p className="font-bold text-black">Lặp 3 lần</p><p className="mt-2 border-l-4 border-black/40 bg-white p-3 font-mono text-black">In “Cố lên!”</p><p className="mt-2 text-sm">Lệnh In nằm bên trong khối Lặp.</p></div>
        <div><p className="mb-2 text-sm font-bold">Đầu ra</p><ol className="space-y-1 font-mono text-black">{[1, 2, 3].map(n => <li key={n}>{n}. Cố lên!</li>)}</ol><p className="mt-2 text-sm">Số thứ tự đánh dấu từng lượt để bạn dễ theo dõi; không phải chữ được in.</p></div>
      </div>
    </figure>
  );
  if (kind === "condition") return (
    <figure className={frame} data-primer-illustration={kind}>
      <figcaption className="font-black text-black">Cùng một lệnh In, hai trường hợp</figcaption>
      <table className="w-full border-collapse text-left text-sm text-black">
        <caption className="mb-3 text-left font-mono">Nếu (điều kiện) thì In “Sẵn sàng!”</caption>
        <thead><tr className="border-b-2 border-black"><th scope="col" className="p-2">Điều kiện</th><th scope="col" className="p-2">Lệnh In bên trong</th></tr></thead>
        <tbody><tr className="border-b border-black/20 bg-[#e7fff3]"><th scope="row" className="p-2">Đúng (true)</th><td className="p-2">Chạy → hiện Sẵn sàng!</td></tr><tr><th scope="row" className="p-2">Sai (false)</th><td className="p-2">Bỏ qua → không in lời nhắn này</td></tr></tbody>
      </table>
    </figure>
  );
  return (
    <figure className={frame} data-primer-illustration={kind}>
      <figcaption className="font-black text-black">Tên biến giữ nguyên, giá trị có thể đổi</figcaption>
      <Flow label="Hai lần gán và in giá trị biến">
        <Node title="diem = 5" detail="In diem → 5" color="bg-[#fff0a8]" /><Arrow />
        <Node title="diem = 10" detail="In diem → 10" color="bg-[#e7fff3]" />
      </Flow>
      <p className="text-sm text-zinc-700">Lệnh In đọc giá trị tại thời điểm chạy. Dòng 5 đã in trước đó không tự đổi thành 10.</p>
    </figure>
  );
}
