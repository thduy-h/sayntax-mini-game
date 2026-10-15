import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Card } from "@/components/ui/card";

interface AuthShellProps {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}

export function AuthShell({ children, description, eyebrow, title }: AuthShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[0.9fr_1fr] lg:items-center lg:gap-14 lg:py-12">
      <section className="min-w-0 lg:py-8">
        <Link aria-label="SAYNTAX — Trang chủ" className="inline-flex rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black" href="/">
          <BrandLogo className="w-44 sm:w-52" priority />
        </Link>
        <p className="mt-3 text-sm font-bold text-zinc-600">Công nghệ không rào cản</p>
        
        <div className="mt-8">
          <span className="rounded-md border border-black bg-[#ffce47] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#121212]">
            {eyebrow}
          </span>
        </div>
        
        <h1 className="font-heading mt-3 text-3xl font-black leading-tight text-black sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-md text-base font-medium leading-relaxed text-zinc-700">{description}</p>
        
        <div className="mt-6 hidden max-w-md space-y-2.5 rounded-2xl border-2 border-black bg-[#fffdf3] p-4 text-xs font-bold text-zinc-800 shadow-[3px_3px_0_#121212] lg:block">
          <p className="font-black uppercase tracking-wider text-black">Ưu điểm khi có tài khoản:</p>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="text-[#0e6245]">✓</span> Lưu tiến độ xuyên suốt mọi thiết bị
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#0e6245]">✓</span> Mở khóa toàn bộ 5 bài học tương tác
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#0e6245]">✓</span> Tùy chỉnh hỗ trợ tiếp cận chuyên sâu
            </li>
          </ul>
        </div>
      </section>
      <Card className="w-full min-w-0 bg-white p-6 shadow-[5px_5px_0_#121212] sm:p-8">{children}</Card>
    </main>
  );
}
