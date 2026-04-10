import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "flex min-h-12 w-full rounded-[1rem] border-4 border-black bg-white px-4 py-3 text-base font-semibold text-black shadow-[6px_6px_0_#121212] transition placeholder:text-slate-500 focus-visible:ring-0",
        className,
      )}
      {...props}
    />
  );
}
