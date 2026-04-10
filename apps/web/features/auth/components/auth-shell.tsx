import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

interface AuthShellProps {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}

export function AuthShell({ children, description, eyebrow, title }: AuthShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-6 px-6 py-10 lg:grid lg:grid-cols-[1fr_1fr] lg:items-center lg:px-10">
      <section className="grid-sheen rounded-[2rem] border-4 border-black bg-[#ffefb8] p-8 shadow-[10px_10px_0_#121212] sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.26em] text-black">{eyebrow}</p>
        <h1 className="font-heading mt-5 text-5xl leading-none text-black sm:text-6xl">{title}</h1>
        <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-zinc-800">{description}</p>
        <div className="mt-8 rounded-[1.4rem] border-4 border-black bg-white p-5 shadow-[6px_6px_0_#121212]">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-black">Vì sao sản phẩm này tồn tại</p>
          <p className="mt-3 text-sm font-medium leading-7 text-zinc-700">
            SheCanCode Voice giảm rào cản thao tác vật lý, đồng thời khẳng định rằng nữ sinh và phụ nữ trẻ có khuyết tật
            hoàn toàn có chỗ đứng trong công nghệ.
          </p>
        </div>
        <Link className="mt-8 inline-flex text-sm font-black uppercase text-black underline decoration-4 underline-offset-4" href="/">
          Quay lại trang giới thiệu
        </Link>
      </section>

      <Card className="bg-[#fffdf3] p-8 sm:p-10">{children}</Card>
    </main>
  );
}
