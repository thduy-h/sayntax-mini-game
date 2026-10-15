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
        <p className="mt-4 text-sm font-semibold text-zinc-600">Công nghệ không rào cản</p>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">{eyebrow}</p>
        <h1 className="font-heading mt-3 text-3xl leading-tight text-black sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-md text-base leading-7 text-zinc-700">{description}</p>
        <p className="mt-6 hidden max-w-md text-sm leading-7 text-zinc-600 lg:block">
          Học lập trình từng bước bằng giọng nói, nhập lệnh hoặc kéo thả khối.
        </p>
      </section>
      <Card className="w-full min-w-0 bg-white p-5 sm:p-8">{children}</Card>
    </main>
  );
}
