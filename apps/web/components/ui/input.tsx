import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export type InputProps = ComponentPropsWithRef<"input">;

export function Input({ className, ref, ...props }: InputProps) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex min-h-12 w-full rounded-[1rem] border-4 border-black bg-white px-4 py-3 text-base font-semibold text-black shadow-[6px_6px_0_#121212] transition placeholder:text-slate-500 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ff5f87] focus-visible:ring-0",
        className,
      )}
      {...props}
    />
  );
}
