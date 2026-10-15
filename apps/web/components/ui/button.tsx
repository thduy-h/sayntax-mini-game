import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-black text-sm font-bold transition duration-150 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#0052cc] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "px-5 py-3",
        lg: "px-6 py-3.5 text-base",
        sm: "min-h-11 rounded-lg px-3 py-2 text-xs",
      },
      variant: {
        default: "bg-[#ff5f87] text-black shadow-[3px_3px_0_#121212] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_#121212]",
        ghost: "bg-white text-black hover:bg-zinc-100",
        outline: "bg-white text-black hover:bg-[#e7fff3]",
        secondary: "bg-[#ffb84d] text-black shadow-[2px_2px_0_#121212] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#121212]",
      },
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, size, type = "button", variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ size, variant }), className)} type={type} {...props} />;
}
