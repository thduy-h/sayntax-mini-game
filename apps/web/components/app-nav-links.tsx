"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

type NavLink = { href: string; label: string };

export function AppNavLinks({ links }: { links: readonly NavLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  function closeMenu(returnFocus = false) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  return (
    <div
      className="contents"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          closeMenu(true);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closeMenu();
      }}
    >
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-label={open ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-black/15 bg-white text-black focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#a83962] md:hidden"
        onClick={() => setOpen(!open)}
        ref={triggerRef}
        type="button"
      >
        {open ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
      </button>
      <div className={`${open ? "flex" : "hidden"} w-full flex-col gap-1 border-t border-black/10 pt-3 md:flex md:w-auto md:flex-row md:gap-2 md:border-0 md:pt-0`} id={menuId}>
        {links.map((link) => {
          const selected = !link.href.includes("#") && pathname === link.href;
          return (
            <Link
              aria-current={selected ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-[#fff0f4] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#a83962] ${selected ? "bg-[#ffe4ed] text-[#7f2446]" : "text-black/75"}`}
              href={link.href}
              key={link.href}
              onClick={() => closeMenu()}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
