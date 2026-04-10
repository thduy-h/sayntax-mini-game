import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-12 items-center justify-center rounded-[1rem] border-4 border-black text-sm font-extrabold uppercase tracking-[0.08em] transition duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "px-5 py-3",
        lg: "px-6 py-3.5 text-base",
        sm: "min-h-10 rounded-[0.85rem] px-4 py-2 text-xs",
      },
      variant: {
        default: "bg-[#ff5f87] text-black shadow-[6px_6px_0_#121212] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#121212]",
        ghost: "bg-[#fffdf3] text-black shadow-[6px_6px_0_#121212] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#121212]",
        outline: "bg-[#7df2c3] text-black shadow-[6px_6px_0_#121212] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#121212]",
        secondary: "bg-[#ffb84d] text-black shadow-[6px_6px_0_#121212] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#121212]",
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
