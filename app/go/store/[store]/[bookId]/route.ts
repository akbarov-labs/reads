/**
 * A book page's link to a store goes through here: the click is counted
 * (lib/stats.ts) and the reader is sent on to that store's search for the
 * book's title. A plain redirect, so it works without JavaScript.
 *
 * The store address is built here from the book's own title, never taken
 * from the URL, so this can't be used to send anyone anywhere else.
 *
 * Outside [locale] and the locale middleware (middleware.ts), and disallowed
 * in robots.txt: it is not a page.
 */
import { after } from "next/server";
import { routing } from "@/i18n/routing";
import { getBookById } from "@/lib/api";
import { isCountable, logClick } from "@/lib/stats";
import { clientIp } from "@/lib/clientIp";
import { storeSearchUrl } from "@/lib/stores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ store: string; bookId: string }> };

const BOOK_ID = /^\d{1,12}$/;

// Never cached, by the browser or by Cloudflare, or a repeat click would
// not reach here to be counted. Never indexed either.
const HEADERS = {
  "Cache-Control": "no-store, private",
  "X-Robots-Tag": "noindex, nofollow",
};

function notFound() {
  return new Response("Not found.", { status: 404, headers: HEADERS });
}

function locale(request: Request): string {
  const asked = new URL(request.url).searchParams.get("l");
  return (routing.locales as readonly string[]).includes(asked ?? "") ? asked! : routing.defaultLocale;
}

async function destination(store: string, bookId: string, lang: string): Promise<string | null> {
  if (!BOOK_ID.test(bookId) || storeSearchUrl(store, "") === null) return null;

  try {
    const book = await getBookById(bookId, lang);
    return book ? storeSearchUrl(store, book.uzbekTitle) : null;
  } catch {
    // The catalogue is unreachable. The reader still came for this store:
    // its search, empty, is better than an error page.
    return storeSearchUrl(store, "");
  }
}

export async function GET(request: Request, { params }: Params) {
  const { store, bookId } = await params;
  const lang = locale(request);
  const url = await destination(store, bookId, lang);

  if (!url) return notFound();

  if (isCountable(request.headers)) {
    const click = {
      kind: "store" as const,
      bookId,
      target: store,
      locale: lang,
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    };

    // After the response has gone: a slow or failing log never holds up
    // the redirect.
    after(() => logClick(click));
  }

  return new Response(null, { status: 302, headers: { ...HEADERS, Location: url } });
}

/** Link checkers ask with HEAD. They get the same answer and are not counted. */
export async function HEAD(request: Request, { params }: Params) {
  const { store, bookId } = await params;
  const url = await destination(store, bookId, locale(request));

  return url
    ? new Response(null, { status: 302, headers: { ...HEADERS, Location: url } })
    : notFound();
}
