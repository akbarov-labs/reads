/**
 * The site's own statistics, kept in Reads-admin so its Site stats page can
 * show them the same day: readers sent to a store (POST /api/clicks), book
 * pages opened (/api/views) and searches readers settled on (/api/searches).
 * Server-only.
 */

import { clientIp } from "@/lib/clientIp";

export type ClickKind = "store";

/** What every report carries about the visitor. Reads-admin hashes it and keeps neither. */
export interface Visitor {
  ip: string | null;
  userAgent: string | null;
}

export interface Click extends Visitor {
  kind: ClickKind;
  bookId?: string;
  /** The store's key, as in lib/stores.ts. */
  target: string;
  locale: string;
}

export interface View extends Visitor {
  bookId: string;
  locale: string;
}

export interface Search extends Visitor {
  query: string;
  /** "page": the books listing. "box": a suggestion picked as the reader typed. */
  source: "page" | "box";
  /** Books the listing found. */
  results?: number;
  /** The page picked from the box, e.g. /book/12. */
  picked?: string;
  locale: string;
}

/**
 * Things that follow links without a person behind them: crawlers, link
 * previews (Telegram, WhatsApp, Facebook), uptime checks and HTTP
 * libraries. A missing user agent is one of them too: every browser sends
 * one. Rough on purpose: a stray miss costs one wrong count, while counting
 * Googlebot's walk over every store link would bury the real ones.
 *
 * Names only what "bot" does not already catch (TelegramBot, ClaudeBot,
 * GPTBot...). Never an app's own name: Telegram's Android in-app browser
 * says "Telegram-Android", and that is a reader, likely most of them.
 */
const BOT_USER_AGENT =
  /bot\b|bot\/|crawl|spider|slurp|scrap|preview|facebookexternalhit|embedly|whatsapp\/|curl|wget|python|httpx|aiohttp|axios|node-fetch|undici|go-http|java\/|okhttp|libwww|headless|lighthouse|pingdom|uptime|monitor|bytespider|claude-user|chatgpt-user|perplexity-user/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent?.trim() || BOT_USER_AGENT.test(userAgent);
}

/**
 * Whether this request is a person. A browser fetching a link ahead of a
 * click (speculation rules, prefetch) is not.
 */
export function isCountable(headers: Headers): boolean {
  if (isBot(headers.get("user-agent"))) return false;

  const purpose = `${headers.get("sec-purpose") ?? ""} ${headers.get("purpose") ?? ""}`;

  return !/prefetch|prerender/i.test(purpose);
}

/**
 * Sends one report. Never throws and gives up after a few seconds: callers
 * run it after the reader's response has gone, and a lost count is better
 * than an error.
 *
 * Without the shared secret nothing is sent. Reads-admin would refuse it
 * anyway, and staging, which reads production's catalogue, runs with the
 * secret emptied so its test visits never land in production's numbers.
 */
async function report(path: string, body: Record<string, unknown>, visitor: Visitor): Promise<void> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return;

  const apiUrl = process.env.API_URL ?? "http://localhost:8000/api";

  try {
    await fetch(`${apiUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        ...body,
        ip: visitor.ip,
        user_agent: visitor.userAgent?.slice(0, 512) ?? null,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Unreachable or slow admin: the count is lost, the reader is not.
  }
}

export function logClick(click: Click): Promise<void> {
  return report(
    "/clicks",
    {
      kind: click.kind,
      book_id: click.bookId ? Number(click.bookId) : null,
      target: click.target,
      locale: click.locale,
    },
    click,
  );
}

export function logView(view: View): Promise<void> {
  return report("/views", { book_id: Number(view.bookId), locale: view.locale }, view);
}

export function logSearch(search: Search): Promise<void> {
  return report(
    "/searches",
    {
      query: search.query,
      source: search.source,
      results: search.results ?? null,
      picked: search.picked ?? null,
      locale: search.locale,
    },
    search,
  );
}

/**
 * The search a books listing request stands for, or null if it is not one
 * to count: only the first page of a plain query. The next page, or the
 * same words narrowed to a category or author, is the same search, and
 * Reads-admin also counts one visitor's repeat once.
 */
export function listingSearch(
  listing: { q?: string; page: number; filters: (string | undefined)[] },
  results: number,
  locale: string,
  headers: Headers,
): Search | null {
  const query = listing.q?.trim();

  if (!query || listing.page !== 1 || listing.filters.some(Boolean) || !isCountable(headers)) return null;

  return {
    query,
    source: "page",
    results,
    locale,
    ip: clientIp({ headers }),
    userAgent: headers.get("user-agent"),
  };
}
