/**
 * Showing deals: what is still on, and how long it has left, in Tashkent
 * days like everything else dated on the site.
 */
import { tashkentToday } from "@/lib/announcements";
import type { Deal } from "@/lib/types";

/**
 * Drops deals whose last day has passed or that haven't started. Reads-admin
 * already does, but a page can sit in the cache a few minutes past midnight.
 */
export function stillOn(deals: Deal[], now: Date = new Date()): Deal[] {
  const today = tashkentToday(now);

  return deals.filter((deal) => (!deal.endsOn || deal.endsOn >= today) && (!deal.startsOn || deal.startsOn <= today));
}

/** Whole days from today to the deal's last day: 0 on the day itself, null with no end. */
export function daysLeft(deal: Deal, now: Date = new Date()): number | null {
  if (!deal.endsOn) return null;

  const today = Date.parse(`${tashkentToday(now)}T00:00:00Z`);
  const last = Date.parse(`${deal.endsOn}T00:00:00Z`);

  return Math.max(0, Math.round((last - today) / 86_400_000));
}

/** Where the deal's button goes: through /go/deal, which counts the click. */
export function dealHref(deal: Deal, locale: string): string | null {
  return deal.url ? `/go/deal/${encodeURIComponent(deal.id)}?l=${encodeURIComponent(locale)}` : null;
}
