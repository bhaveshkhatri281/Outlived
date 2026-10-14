import { formatUnits } from "@/lib/commerce/format";

/**
 * The rust unit counter. Rust on ink is ~3.95:1, which only passes WCAG AA as
 * large text, so the counter is always ≥ 19px bold.
 */
export function UnitCounter({
  left,
  total,
  suffix,
  bar = false,
  className = "",
}: {
  left: number;
  total: number;
  suffix?: string;
  bar?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="font-mono text-[19px] font-bold uppercase leading-none tracking-[0.04em] text-rust tabular-nums">
        {formatUnits(left, total)}
        {suffix && <span className="sr-only"> {suffix}</span>}
      </p>
      {bar && (
        <div className="mt-3 h-px w-full bg-line" aria-hidden="true">
          <div className="h-px bg-rust" style={{ width: `${(left / total) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
