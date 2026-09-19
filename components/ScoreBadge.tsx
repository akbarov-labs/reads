import type { AspectScores } from "@/lib/types";

/**
 * A taqriz score out of ten. Null is a real state — a reviewer may leave the
 * whole score blank — and renders as nothing rather than as a zero.
 */
export function ScoreBadge({
  score,
  size = "md",
}: {
  score?: number | null;
  size?: "sm" | "md" | "lg";
}) {
  if (score === null || score === undefined) return null;

  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <span
      className={`inline-flex items-baseline gap-0.5 rounded-full bg-amber-50 border border-amber-200 font-medium text-amber-900 ${sizes[size]}`}
    >
      <span className="font-serif">{score.toFixed(1)}</span>
      <span className="text-amber-600/70 text-[0.8em]">/10</span>
    </span>
  );
}

/**
 * The per-aspect breakdown. Only the aspects that were actually scored are
 * listed: an absent key means "not rated", which is not the same as zero —
 * "Tarjima sifati" is absent for a book with no translator.
 */
export function AspectBreakdown({
  scores,
  labels,
}: {
  scores: AspectScores;
  labels: Record<string, string>;
}) {
  const entries = Object.entries(scores).filter(
    ([, value]) => typeof value === "number"
  ) as [string, number][];

  if (entries.length === 0) return null;

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <dt className="text-xs text-zinc-500">{labels[key] ?? key}</dt>
          <dd className="flex items-center gap-2">
            {/* A ten-segment bar reads faster than a number when scanning
                several aspects at once; the number stays for precision. */}
            <span
              aria-hidden
              className="hidden sm:block h-1 w-20 rounded-full bg-stone-200 overflow-hidden"
            >
              <span
                className="block h-full rounded-full bg-amber-400"
                style={{ width: `${(value / 10) * 100}%` }}
              />
            </span>
            <span className="font-serif text-sm text-zinc-800 tabular-nums">
              {value.toFixed(1)}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
