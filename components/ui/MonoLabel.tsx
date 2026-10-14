import type { ComponentPropsWithoutRef, ElementType } from "react";

type Props<T extends ElementType> = {
  as?: T;
  /** "ash" for secondary placard text, "bone" for primary. */
  tone?: "ash" | "bone";
} & ComponentPropsWithoutRef<T>;

/** Museum-placard text: `OTL-D07-35 · ERA 01 · UNIT 047/150`. */
export function MonoLabel<T extends ElementType = "span">({ as, tone = "ash", className = "", ...rest }: Props<T>) {
  const Tag = as ?? "span";
  return <Tag className={`mono ${tone === "ash" ? "text-ash" : "text-bone"} ${className}`} {...rest} />;
}

/** Joins placard parts with a middle dot. */
export function placard(...parts: (string | number | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" · ");
}
