import type { FC, ReactNode } from "react";

export interface VoiceBadgeProps {
  command: string;
  label?: string;
  actionHint?: string;
  size?: "sm" | "md" | "lg";
  variant?: "pink" | "yellow" | "mint" | "blue" | "white";
  className?: string;
  children?: ReactNode;
}

const VARIANT_STYLES: Record<NonNullable<VoiceBadgeProps["variant"]>, string> = {
  pink: "bg-[#fff0f5] border-black text-black",
  yellow: "bg-[#fffdf0] border-black text-black",
  mint: "bg-[#e7fff3] border-black text-black",
  blue: "bg-[#f0f6ff] border-black text-black",
  white: "bg-white border-black text-black",
};

export const VoiceBadge: FC<VoiceBadgeProps> = ({
  command,
  label = "Nói:",
  actionHint,
  size = "md",
  variant = "yellow",
  className = "",
  children,
}) => {
  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3 py-1.5 text-sm gap-2",
    lg: "px-3.5 py-2 text-base sm:text-lg gap-2",
  }[size];

  const commandTextSize = {
    sm: "text-sm sm:text-base",
    md: "text-base sm:text-lg",
    lg: "text-lg sm:text-xl",
  }[size];

  const ariaDescription = `${label} "${command}"${actionHint ? ` ${actionHint}` : ""}`;

  return (
    <span
      role="group"
      aria-label={ariaDescription}
      className={`inline-flex flex-wrap items-center rounded-xl border-2 shadow-[2px_2px_0_#121212] font-medium transition-transform hover:-translate-y-0.5 ${VARIANT_STYLES[variant]} ${sizeClasses} ${className}`}
    >
      <span className="flex items-center gap-1 shrink-0 font-bold text-zinc-700">
        <span aria-hidden="true" className="text-base">🎙️</span>
        <span className="uppercase text-[11px] sm:text-xs tracking-wider">{label}</span>
      </span>

      <strong className={`font-mono font-black text-black underline decoration-2 underline-offset-2 ${commandTextSize}`}>
        &ldquo;{command}&rdquo;
      </strong>

      {actionHint && (
        <span className="text-zinc-600 text-xs sm:text-sm font-semibold">
          {actionHint}
        </span>
      )}

      {children}
    </span>
  );
};
