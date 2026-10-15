import type { AppRole } from "@shecancode/shared-types";
import Link from "next/link";
import { AppNavLinks } from "@/components/app-nav-links";
import { BrandLogo } from "@/components/brand-logo";
import { getCurrentAppUser } from "@/features/auth/server/data";

const studentLinks = [
  { href: "/lessons-v2", label: "Học tập" },
  { href: "/dashboard", label: "Tiến độ" },
  { href: "/role-models", label: "Hình mẫu công nghệ" },
] as const;

const adminLinks = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin#programs", label: "Bài làm" },
  { href: "/admin#program-runs-overview", label: "Lượt học" },
  { href: "/admin#progress-overview", label: "Tiến độ người học" },
  { href: "/admin#voice-logs-overview", label: "Lệnh giọng nói" },
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
      className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/15 bg-white px-4 py-3 shadow-sm"
    >
      <Link
        aria-label="SAYNTAX - về trang chính"
        className="flex min-h-12 shrink-0 items-center"
        href="/"
      >
        <BrandLogo className="w-[148px] sm:w-[170px]" />
      </Link>
      <AppNavLinks links={links} />
    </nav>
  );
}
