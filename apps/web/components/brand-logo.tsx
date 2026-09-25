import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
  variant?: "horizontal" | "icon" | "stacked";
}

const brandAssets = {
  horizontal: {
    alt: "SAYNTAX - Công nghệ không rào cản",
    height: 593,
    src: "/brand/sayntax-v2-primary-horizontal.png",
    width: 2132,
  },
  icon: {
    alt: "Biểu tượng SAYNTAX",
    height: 570,
    src: "/brand/sayntax-v2-icon-only.png",
    width: 751,
  },
  stacked: {
    alt: "SAYNTAX - Công nghệ không rào cản",
    height: 921,
    src: "/brand/sayntax-v2-stacked.png",
    width: 1437,
  },
} as const;

export function BrandLogo({ className, priority = false, variant = "horizontal" }: BrandLogoProps) {
  const asset = brandAssets[variant];

  return (
    <Image
      alt={asset.alt}
      className={cn("h-auto max-w-full object-contain", className)}
      height={asset.height}
      priority={priority}
      src={asset.src}
      width={asset.width}
    />
  );
}
