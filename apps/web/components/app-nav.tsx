import type { AppRole } from "@shecancode/shared-types";
import Link from "next/link";
import { getCurrentAppUser } from "@/features/auth/server/data";

const studentLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/lessons-v2", label: "Bài học" },
  { href: "/dashboard#progress", label: "Tiến độ" },
  { href: "/role-models", label: "Role Models" },
  { href: "/onboarding", label: "Trợ giúp" },
] as const;

const adminLinks = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin#programs", label: "Programs" },
  { href: "/admin#program-runs", label: "Lượt học" },
  { href: "/admin#progress", label: "Tiến độ người học" },
  { href: "/admin#voice-logs", label: "Voice logs" },
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
      <Link className="font-heading text-lg font-black text-black" href={user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/"}>
        SheCanCode Voice
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
