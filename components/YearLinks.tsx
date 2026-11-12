import { Link } from "@/i18n/navigation";
import type { YearCount } from "@/lib/api";

/** At most this many years as chips; the rest are on the books page's filter. */
const SHOWN = 12;

/**
 * "By year": one chip per year a person's or publisher's books were
 * printed, each opening the books page with that filter, plus one to filter
 * further there. Nothing when there's only one year to pick.
 */
export function YearLinks({
  years,
  filter,
  label,
  moreLabel,
  className = "",
}: {
  years: YearCount[];
  /** The list the chips narrow, e.g. { publisher: "hilol-nashr" }. */
  filter: Record<string, string>;
  label: string;
  moreLabel: string;
  className?: string;
}) {
  if (years.length < 2) return null;

  const href = (extra: Record<string, string> = {}) => `/books?${new URLSearchParams({ ...filter, ...extra })}`;

  return (
    <nav aria-label={label} className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="mr-1 text-xs text-zinc-500">{label}:</span>
      {years.slice(0, SHOWN).map(({ year, count }) => (
        <Link
          key={year}
          href={href({ year: String(year) })}
          className="rounded-full border border-stone-300 px-3 py-1 text-xs tabular-nums text-zinc-600 transition-colors hover:border-forest-400 hover:text-forest-800"
        >
          {year} <span className="text-zinc-400">· {count}</span>
        </Link>
      ))}
      <Link href={href()} className="px-1 text-xs font-medium text-forest-700 hover:text-forest-800">
        {moreLabel} →
      </Link>
    </nav>
  );
}
