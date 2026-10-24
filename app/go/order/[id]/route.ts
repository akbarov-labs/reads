/**
 * An announcement's order button goes through here: the click is counted
 * (lib/stats.ts, kind publisher_order) and the reader is sent to the
 * publisher's Telegram with the order message typed (lib/order.ts). A plain
 * redirect, so it works without JavaScript.
 *
 * The address comes from the announcement as Reads-admin serves it, never
 * from the URL. An announcement that has expired or been taken down is a
 * 404, so a stale link never orders a pre-order past its deadline.
 *
 * Outside [locale] and the locale middleware, and disallowed in robots.txt
 * with the rest of /go/.
 */
import { after } from "next/server";
import { routing } from "@/i18n/routing";
import { getAnnouncement } from "@/lib/api";
import { clientIp } from "@/lib/clientIp";
import { orderUrl } from "@/lib/order";
import { isCountable, logClick } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const ANNOUNCEMENT_ID = /^\d{1,12}$/;

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

async function destination(id: string, lang: string): Promise<string | null | "unavailable"> {
  if (!ANNOUNCEMENT_ID.test(id)) return null;

  try {
    const announcement = await getAnnouncement(id);
    return announcement ? orderUrl(announcement, lang) : null;
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
  const { id } = await params;
  const lang = locale(request);
  const url = await destination(id, lang);

  if (url && url !== "unavailable" && isCountable(request.headers)) {
    const click = {
      kind: "publisher_order" as const,
      announcementId: id,
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
  const { id } = await params;

  return answer(await destination(id, locale(request)));
}
