import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLElement> & {
  as?: "span" | "p" | "div";
  /** "ash" for secondary placard text, "bone" for primary. */
  tone?: "ash" | "bone";
};

/** Museum-placard text: `OTL-D07-35 · ERA 01 · UNIT 047/150`. */
export function MonoLabel({ as: Tag = "span", tone = "ash", className = "", ...rest }: Props) {
  return <Tag className={`mono ${tone === "ash" ? "text-ash" : "text-bone"} ${className}`} {...rest} />;
}

/** Joins placard parts with a middle dot. */
export function placard(...parts: (string | number | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" · ");
}
