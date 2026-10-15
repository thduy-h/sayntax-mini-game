import type { HTMLAttributes, ReactNode } from "react";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Surface({ children, className = "", ...props }: SurfaceProps) {
  return (
    <div
      className={`rounded-2xl border-2 border-black bg-[#fffdf3] p-5 shadow-[3px_3px_0_#121212] sm:p-6 ${className}`.trim()}
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
    <span className="inline-flex items-center rounded-lg border-2 border-black bg-[#7df2c3] px-3 py-1 text-sm font-bold uppercase text-black">
      {children}
    </span>
  );
}
