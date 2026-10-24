/**
 * Showing publishers' announcements: what is still live, and sums and days
 * the way readers write them.
 */
import type { Announcement } from "@/lib/types";

/** Today in Tashkent as YYYY-MM-DD: pre-order deadlines are Tashkent days. */
export function tashkentToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(now);
}

/**
 * Drops pre-orders whose last day has passed. Reads-admin already does, but
 * a page can sit in the cache for a few minutes past midnight.
 */
export function stillOpen(announcements: Announcement[], now: Date = new Date()): Announcement[] {
  const today = tashkentToday(now);

  return announcements.filter((announcement) => !announcement.preorderDeadline || announcement.preorderDeadline >= today);
}

/** 95000 → "95 000": thousands apart by a space, as prices are written here; a comma in English. */
export function formatSum(sum: number, locale: string): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU").format(sum).replace(/ | /g, " ");
}

/** "2026-10-31" → "31-oktabr" / "31 октября" / "31 October". */
export function formatDay(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
