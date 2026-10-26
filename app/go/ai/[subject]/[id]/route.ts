/**
 * A page's ask-AI button goes through here: the click is counted
 * (lib/stats.ts, kind ask_ai, the kind of page as its target) and the reader
 * is sent on to Google's AI Mode with the page's question asked
 * (lib/askAi.ts). A plain redirect, so it works without JavaScript.
 *
 * The question is built here from the catalogue's own record, never taken
 * from the URL, and the destination is always AI Mode, so this can't be
 * used to send anyone anywhere else or to put words in Kitoblarim's mouth.
 *
 * Outside [locale] and the locale middleware, and disallowed in robots.txt
 * with the rest of /go/.
 */
import { after } from "next/server";
import { createTranslator } from "next-intl";
import { routing } from "@/i18n/routing";
import { getAuthorBySlug, getBookById, getPublisherBySlug, getTranslatorBySlug } from "@/lib/api";
import {
  ASK_AI_SUBJECTS,
  askAiUrl,
  authorQuestion,
  bookQuestion,
  publisherQuestion,
  translatorQuestion,
  type AskAiSubject,
} from "@/lib/askAi";
import { clientIp } from "@/lib/clientIp";
import { isCountable, logClick } from "@/lib/stats";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import uz from "@/messages/uz.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subject: string; id: string }> };

const MESSAGES = { uz, ru, en };

const BOOK_ID = /^\d{1,12}$/;
const SLUG = /^[a-z0-9][a-z0-9._-]{0,159}$/i;

// Never cached, by the browser or by Cloudflare, or a repeat click would
// not reach here to be counted. Never indexed either.
const HEADERS = {
  "Cache-Control": "no-store, private",
  "X-Robots-Tag": "noindex, nofollow",
};

function locale(request: Request): keyof typeof MESSAGES {
  const asked = new URL(request.url).searchParams.get("l");
  return (routing.locales as readonly string[]).includes(asked ?? "")
    ? (asked as keyof typeof MESSAGES)
    : routing.defaultLocale;
}

function isSubject(value: string): value is AskAiSubject {
  return (ASK_AI_SUBJECTS as readonly string[]).includes(value);
}

/** The page's question, as its button asked it; null for no such page. */
async function question(subject: AskAiSubject, id: string, lang: keyof typeof MESSAGES): Promise<string | null> {
  const t = createTranslator({ locale: lang, messages: MESSAGES[lang], namespace: "askAi" }) as unknown as Parameters<
    typeof bookQuestion
  >[1];

  switch (subject) {
    case "book": {
      const book = BOOK_ID.test(id) ? await getBookById(id, lang) : null;
      return book ? bookQuestion(book, t) : null;
    }
    case "author": {
      const author = SLUG.test(id) ? await getAuthorBySlug(id, lang) : null;
      return author ? authorQuestion(author, t) : null;
    }
    case "translator": {
      const translator = SLUG.test(id) ? await getTranslatorBySlug(id, lang) : null;
      return translator ? translatorQuestion(translator, t) : null;
    }
    case "publisher": {
      const publisher = SLUG.test(id) ? await getPublisherBySlug(id, lang) : null;
      return publisher ? publisherQuestion(publisher, t) : null;
    }
  }
}

async function destination(subject: string, id: string, lang: keyof typeof MESSAGES): Promise<string | null | "unavailable"> {
  if (!isSubject(subject)) return null;

  try {
    const asked = await question(subject, id, lang);
    return asked ? askAiUrl(asked, lang) : null;
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
  const { subject, id } = await params;
  const lang = locale(request);
  const url = await destination(subject, id, lang);

  if (url && url !== "unavailable" && isCountable(request.headers)) {
    const click = {
      kind: "ask_ai" as const,
      bookId: subject === "book" ? id : undefined,
      target: subject,
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
  const { subject, id } = await params;

  return answer(await destination(subject, id, locale(request)));
}
