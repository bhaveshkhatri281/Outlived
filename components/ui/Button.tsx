import Link from "next/link";
import type { ComponentPropsWithoutRef, ComponentPropsWithRef } from "react";

type Variant = "primary" | "outline" | "quiet";

// Primary labels are 19px bold: bone on rust is ~4:1, which passes WCAG AA as large text only.
const base =
  "inline-flex items-center justify-center gap-3 uppercase transition-colors duration-200 select-none disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "h-14 px-7 bg-rust text-bone text-[19px] font-bold tracking-[0.01em] hover:bg-bone hover:text-ink",
  outline:
    "h-12 px-6 border border-bone text-bone text-[14px] font-semibold tracking-[0.06em] hover:bg-bone hover:text-ink",
  quiet: "h-10 px-0 text-bone text-[14px] font-medium tracking-[0.06em] underline-offset-[6px] hover:underline",
};

export function buttonClass(variant: Variant = "primary", className = "") {
  return `${base} ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...rest
}: ComponentPropsWithRef<"button"> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...rest} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...rest} />;
}
