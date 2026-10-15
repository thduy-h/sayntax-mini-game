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
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border-2 border-black bg-white text-black shadow-[2px_2px_0_#121212] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black md:hidden"
        onClick={() => setOpen(!open)}
        ref={triggerRef}
        type="button"
      >
        {open ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
      </button>
      <div className={`${open ? "flex" : "hidden"} w-full flex-col gap-1.5 border-t-2 border-black/10 pt-3 md:flex md:w-auto md:flex-row md:items-center md:gap-2 md:border-0 md:pt-0`} id={menuId}>
        {links.map((link) => {
          const selected = !link.href.includes("#") && pathname === link.href;
          return (
            <Link
              aria-current={selected ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-xl px-3.5 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
                selected
                  ? "border-2 border-black bg-[#ff5f87] text-black shadow-[2px_2px_0_#121212]"
                  : "border-2 border-transparent text-zinc-700 hover:border-black/30 hover:bg-zinc-50"
              }`}
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
