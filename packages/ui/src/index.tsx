import type { HTMLAttributes, ReactNode } from "react";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Surface({ children, className = "", ...props }: SurfaceProps) {
  return (
    <div
      className={`rounded-[1.4rem] border-4 border-black bg-[#fffdf3] p-6 shadow-[8px_8px_0_#121212] ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
}

export function Badge({ children }: BadgeProps) {
  return (
    <span className="inline-flex items-center rounded-[0.9rem] border-4 border-black bg-[#7df2c3] px-3 py-1 text-sm font-extrabold uppercase text-black shadow-[4px_4px_0_#121212]">
      {children}
    </span>
  );
}
