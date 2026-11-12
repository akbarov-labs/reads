/**
 * A deal's button goes through here: the click is counted (lib/stats.ts,
 * kind deal, target "deal-<id>") and the reader is sent on to the shop's
 * page or the post. A plain redirect, so it works without JavaScript.
 *
 * The address comes from the deal as Reads-admin serves it, never from the
 * URL, so this can't be used to send anyone anywhere else. A deal that has
 * ended or been taken down is a 404.
 *
 * Outside [locale] and the locale middleware, and disallowed in robots.txt
 * with the rest of /go/.
 */
import { after } from "next/server";
import { routing } from "@/i18n/routing";
import { getDeal } from "@/lib/api";
import { clientIp } from "@/lib/clientIp";
import { safeExternalUrl } from "@/lib/safeUrl";
import { isCountable, logClick } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const DEAL_ID = /^\d{1,10}$/;

// Never cached, or a repeat click would not reach here to be counted.
const HEADERS = {
  "Cache-Control": "no-store, private",
  "X-Robots-Tag": "noindex, nofollow",
};

function locale(request: Request): string {
  const asked = new URL(request.url).searchParams.get("l");
  return (routing.locales as readonly string[]).includes(asked ?? "") ? asked! : routing.defaultLocale;
}

async function destination(id: string): Promise<string | null | "unavailable"> {
  if (!DEAL_ID.test(id)) return null;

  try {
    const deal = await getDeal(id);
    return deal ? safeExternalUrl(deal.url) : null;
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
  const url = await destination(id);

  if (url && url !== "unavailable" && isCountable(request.headers)) {
    const click = {
      kind: "deal" as const,
      target: `deal-${id}`,
      locale: locale(request),
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    };

    after(() => logClick(click));
  }

  return answer(url);
}

/** Link checkers ask with HEAD. They get the same answer and are not counted. */
export async function HEAD(_request: Request, { params }: Params) {
  const { id } = await params;

  return answer(await destination(id));
}
