/**
 * The click log: readers this site sent to a store, counted in Reads-admin
 * (POST /api/clicks) so stores and publishers can be shown what Kitoblarim
 * sends them. Server-only.
 */

export type ClickKind = "store";

export interface Click {
  kind: ClickKind;
  bookId?: string;
  /** The store's key, as in lib/stores.ts. */
  target: string;
  locale: string;
  /** The visitor's address and browser. Reads-admin hashes them and keeps neither. */
  ip: string | null;
  userAgent: string | null;
}

/**
 * Things that follow links without a person behind them: crawlers, link
 * previews (Telegram, WhatsApp, Facebook), uptime checks and HTTP
 * libraries. A missing user agent is one of them too: every browser sends
 * one. Rough on purpose: a stray miss costs one wrong click, while counting
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
 * Whether this request is a person following a link. A browser fetching the
 * link ahead of a click (speculation rules, prefetch) is not.
 */
export function isCountable(request: Request): boolean {
  if (isBot(request.headers.get("user-agent"))) return false;

  const purpose = `${request.headers.get("sec-purpose") ?? ""} ${request.headers.get("purpose") ?? ""}`;

  return !/prefetch|prerender/i.test(purpose);
}

/**
 * Records one click. Never throws and gives up after a few seconds: the
 * caller has already sent the reader on, and a lost click is better than
 * an error.
 *
 * Without the shared secret nothing is sent. Reads-admin would refuse it
 * anyway, and staging, which reads production's catalogue, runs with the
 * secret emptied so its test clicks never land in production's counts.
 */
export async function logClick(click: Click): Promise<void> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return;

  const apiUrl = process.env.API_URL ?? "http://localhost:8000/api";

  try {
    await fetch(`${apiUrl}/clicks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        kind: click.kind,
        book_id: click.bookId ? Number(click.bookId) : null,
        target: click.target,
        locale: click.locale,
        ip: click.ip,
        user_agent: click.userAgent?.slice(0, 512) ?? null,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Unreachable or slow admin: the click is lost, the reader is not.
  }
}
