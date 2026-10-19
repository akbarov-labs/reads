import type { ReaderCounts as Counts } from "@/lib/types";

/**
 * "Kitoblarim botida: 474 kishi oʻqimoqchi · 43 kishi oʻqiyapti · 20 kishi
 * oʻqib boʻlgan" — real counts from the bot's shelves, set beside the
 * hand-off to it. Only the parts above zero; nothing at all when none are.
 */
export function ReaderCounts({
  counts,
  t,
  className = "",
}: {
  counts: Counts | null | undefined;
  t: (key: string, values?: Record<string, number>) => string;
  className?: string;
}) {
  const parts = [
    counts?.reading ? t("readersReading", { count: counts.reading }) : null,
    counts?.want ? t("readersWant", { count: counts.want }) : null,
    counts?.read ? t("readersRead", { count: counts.read }) : null,
  ].filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <p className={`text-sm text-zinc-600 ${className}`}>
      <span className="text-zinc-500">{t("readersInBot")}</span> {parts.join(" · ")}
    </p>
  );
}
