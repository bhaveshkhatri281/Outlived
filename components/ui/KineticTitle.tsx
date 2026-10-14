/**
 * Huge display title whose letters rise out of a mask on first paint
 * (CSS only, so it runs before hydration and never delays content).
 */
export function KineticTitle({
  text,
  as: Tag = "h1",
  className = "",
  delay = 0,
}: {
  text: string;
  as?: "h1" | "h2" | "p";
  className?: string;
  delay?: number;
}) {
  const words = text.split(" ");
  let n = 0;
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, wi) => (
        <span key={wi} aria-hidden="true" className="inline-block overflow-hidden pb-[0.06em] align-bottom">
          {[...w].map((ch, ci) => (
            <span
              key={ci}
              className="kinetic-char inline-block"
              style={{ animationDelay: `${delay + n++ * 35}ms` }}
            >
              {ch}
            </span>
          ))}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
}
