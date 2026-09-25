import type { AppRole } from "@shecancode/shared-types";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { getCurrentAppUser } from "@/features/auth/server/data";

const studentLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/lessons-v2", label: "Bài học" },
  { href: "/dashboard#progress", label: "Tiến độ" },
  { href: "/role-models", label: "Hình mẫu công nghệ" },
  { href: "/onboarding", label: "Trợ giúp" },
] as const;

const adminLinks = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin#programs", label: "Bài làm" },
  { href: "/admin#program-runs", label: "Lượt học" },
  { href: "/admin#progress", label: "Tiến độ người học" },
  { href: "/admin#voice-logs", label: "Lệnh giọng nói" },
] as const;

function navLinks(role: AppRole | null) {
  if (role === "admin") return adminLinks;
  return studentLinks;
}

export async function AppNav() {
  const user = await getCurrentAppUser();
  const links = navLinks(user?.role ?? null);

  return (
    <nav
      aria-label={user?.role === "admin" ? "Điều hướng quản trị" : "Điều hướng học viên"}
      className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border-4 border-black bg-white px-4 py-3 shadow-[6px_6px_0_#121212]"
    >
      <Link
        aria-label="SAYNTAX - về trang chính"
        className="flex min-h-12 shrink-0 items-center"
        href={user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/"}
      >
        <BrandLogo className="w-[148px] sm:w-[170px]" />
      </Link>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            className="inline-flex min-h-10 items-center rounded-[0.75rem] border-2 border-black bg-[#fffdf3] px-3 py-2 text-xs font-black uppercase text-black transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ff5f87]"
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
