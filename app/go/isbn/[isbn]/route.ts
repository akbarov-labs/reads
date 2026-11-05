/**
 * A title in the monthly list a Kitoblarim reader shares in Telegram goes
 * through here: the click is counted (lib/stats.ts, kind shared_list) and the
 * reader's friend lands on the book's page. A plain redirect, so it works
 * without JavaScript.
 *
 * The bot knows a book by its ISBN and not by this site's id, so the page is
 * found here, as Reads-admin serves it. A book the bot has sent over that no
 * editor has approved yet goes to the catalogue instead of a dead end, since
 * the message with the link stays in the chat for good. With ?r=1 the reader
 * made their review public, and the page opens at the readers' section.
 *
 * Only ever leads to this site's own pages. Outside [locale] and the locale
 * middleware, and disallowed in robots.txt with the rest of /go/.
 */
import { after } from "next/server";
import { routing } from "@/i18n/routing";
import { getBooks } from "@/lib/api";
import { clientIp } from "@/lib/clientIp";
import { isCountable, logClick } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ isbn: string }> };

const ISBN = /^\d{13}$/;

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

/** The book's id on this site, null when it has no such book, "unavailable" when the API can't say. */
async function findBookId(isbn: string, lang: string): Promise<string | null | "unavailable"> {
  try {
    const { items } = await getBooks(lang, { isbn, perPage: 1 });
    return items[0]?.id ?? null;
  } catch {
    return "unavailable";
  }
}

function redirect(path: string): Response {
  return new Response(null, { status: 302, headers: { ...HEADERS, Location: path } });
}

function answer(request: Request, bookId: string | null | "unavailable", lang: string): Response {
  if (bookId === "unavailable") {
    return new Response("The catalogue is unreachable. Please try again in a minute.", { status: 503, headers: HEADERS });
  }

  if (!bookId) return redirect(`/${lang}/books`);

  const atReviews = new URL(request.url).searchParams.get("r") === "1";

  return redirect(`/${lang}/book/${encodeURIComponent(bookId)}${atReviews ? "#readers" : ""}`);
}

function notFound(): Response {
  return new Response("Not found.", { status: 404, headers: HEADERS });
}

export async function GET(request: Request, { params }: Params) {
  const { isbn } = await params;
  if (!ISBN.test(isbn)) return notFound();

  const lang = locale(request);
  const bookId = await findBookId(isbn, lang);

  if (bookId && bookId !== "unavailable" && isCountable(request.headers)) {
    const click = {
      kind: "shared_list" as const,
      bookId,
      locale: lang,
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    };

    // After the response has gone: a slow or failing log never holds up
    // the redirect.
    after(() => logClick(click));
  }

  return answer(request, bookId, lang);
}

/** Link checkers ask with HEAD. They get the same answer and are not counted. */
export async function HEAD(request: Request, { params }: Params) {
  const { isbn } = await params;
  if (!ISBN.test(isbn)) return notFound();

  const lang = locale(request);

  return answer(request, await findBookId(isbn, lang), lang);
}
