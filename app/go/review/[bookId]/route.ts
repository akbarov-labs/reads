/**
 * A book page's "write a review" button goes through here: the click is
 * counted (lib/stats.ts, kind bot_review) and the reader is sent on to the
 * Kitoblarim bot, which opens the book at its review (lib/bot.ts). A plain
 * redirect, so it works without JavaScript.
 *
 * The bot link is built from the book's ISBN as Reads-admin serves it,
 * never from the URL, and always points at the bot, so this can't be used
 * to send anyone anywhere else.
 *
 * Outside [locale] and the locale middleware, and disallowed in robots.txt
 * with the rest of /go/.
 */
import { after } from "next/server";
import { routing } from "@/i18n/routing";
import { getBookById } from "@/lib/api";
import { bookIsbn, botReviewUrl } from "@/lib/bot";
import { clientIp } from "@/lib/clientIp";
import { isCountable, logClick } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ bookId: string }> };

const BOOK_ID = /^\d{1,12}$/;

// Never cached, by the browser or by Cloudflare, or a repeat click would
// not reach here to be counted. Never indexed either.
const HEADERS = {
  "Cache-Control": "no-store, private",
  "X-Robots-Tag": "noindex, nofollow",
};

function locale(request: Request): string {
  const asked = new URL(request.url).searchParams.get("l");
  return (routing.locales as readonly string[]).includes(asked ?? "") ? asked! : routing.defaultLocale;
}

async function destination(bookId: string, lang: string): Promise<string | null | "unavailable"> {
  if (!BOOK_ID.test(bookId)) return null;

  try {
    const book = await getBookById(bookId, lang);
    return book ? botReviewUrl(bookIsbn(book)) : null;
  } catch {
    return "unavailable";
  }
}

function answer(url: string | null | "unavailable"): Response {
  if (url === "unavailable") {
    return new Response("The catalogue is unreachable. Please try again in a minute.", { status: 503, headers: HEADERS });
  }

  return url
    ? new Response(null, { status: 302, headers: { ...HEADERS, Location: url } })
    : new Response("Not found.", { status: 404, headers: HEADERS });
}

export async function GET(request: Request, { params }: Params) {
  const { bookId } = await params;
  const lang = locale(request);
  const url = await destination(bookId, lang);

  if (url && url !== "unavailable" && isCountable(request.headers)) {
    const click = {
      kind: "bot_review" as const,
      bookId,
      locale: lang,
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    };

    // After the response has gone: a slow or failing log never holds up
    // the redirect.
    after(() => logClick(click));
  }

  return answer(url);
}

/** Link checkers ask with HEAD. They get the same answer and are not counted. */
export async function HEAD(request: Request, { params }: Params) {
  const { bookId } = await params;

  return answer(await destination(bookId, locale(request)));
}
