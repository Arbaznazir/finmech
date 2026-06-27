import Image from "next/image";
import { cn } from "@/lib/utils";

const BRAND_ALT = "FinMech — Smart tools. Smart finance";

const variants = {
  navbar: {
    src: "/brand/logo-horizontal.png",
    width: 420,
    height: 120,
    className: "h-9 w-auto",
  },
  footer: {
    src: "/brand/logo-horizontal-light.png",
    width: 420,
    height: 120,
    className: "h-10 w-auto",
  },
  auth: {
    src: "/brand/logo-stacked-dark.png",
    width: 280,
    height: 280,
    className: "h-28 w-28 mx-auto rounded-full ring-2 ring-primary/20 shadow-lg shadow-primary/10",
  },
  icon: {
    src: "/brand/icon-dark.png",
    width: 64,
    height: 64,
    className: "h-8 w-8 rounded-full object-cover",
  },
  stacked: {
    src: "/brand/logo-stacked-light.png",
    width: 280,
    height: 280,
    className: "h-32 w-32 mx-auto rounded-full",
  },
  hero: {
    src: "/brand/logo-stacked-dark.png",
    width: 280,
    height: 280,
    className:
      "h-36 w-36 mx-auto rounded-full ring-2 ring-primary/30 shadow-xl shadow-primary/20",
  },
} as const;

export type BrandLogoVariant = keyof typeof variants;

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({
  variant = "navbar",
  className,
  priority,
}: BrandLogoProps) {
  const config = variants[variant];

  if (variant === "hero" || variant === "auth" || variant === "stacked") {
    return (
      <div
        className={cn(
          config.className,
          "relative shrink-0 overflow-hidden",
          className
        )}
      >
        <Image
          src={config.src}
          alt={BRAND_ALT}
          fill
          sizes="(max-width: 768px) 144px, 144px"
          className="object-cover object-center"
          priority={priority ?? variant === "hero"}
        />
      </div>
    );
  }

  return (
    <Image
      src={config.src}
      alt={BRAND_ALT}
      width={config.width}
      height={config.height}
      className={cn(config.className, className)}
      priority={priority ?? variant === "navbar"}
    />
  );
}
