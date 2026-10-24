/**
 * Notes from the browser for the site's statistics (lib/note.ts): a book
 * page opened, a suggestion picked from the search box. Checked here and
 * passed on to Reads-admin (lib/stats.ts) after the answer has gone.
 *
 * Always 204, whatever arrives: the browser does nothing with the answer,
 * and a script poking at it learns nothing.
 */
import { after } from "next/server";
import { routing } from "@/i18n/routing";
import { clientIp } from "@/lib/clientIp";
import { isCountable, logSearch, logView } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A note is a few dozen bytes; anything far bigger is not one.
const MAX_BODY_BYTES = 2 * 1024;

const BOOK_ID = /^\d{1,12}$/;

// A page on this site without its locale: /book/12, /author/tolstoy.
const SITE_PATH = /^\/(book|author|translator|publisher)\/[\p{L}\p{N}._%-]{1,150}$/u;

const done = () => new Response(null, { status: 204 });

function isLocale(value: unknown): value is string {
  return typeof value === "string" && (routing.locales as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  if (!isCountable(request.headers)) return done();

  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return done();

  let note: Record<string, unknown>;
  try {
    note = JSON.parse(text);
  } catch {
    return done();
  }

  if (!note || typeof note !== "object" || !isLocale(note.locale)) return done();

  const visitor = { ip: clientIp(request), userAgent: request.headers.get("user-agent") };
  const locale = note.locale;

  if (note.type === "view" && typeof note.bookId === "string" && BOOK_ID.test(note.bookId)) {
    const bookId = note.bookId;
    after(() => logView({ ...visitor, bookId, locale }));
  } else if (
    note.type === "search" &&
    typeof note.query === "string" &&
    note.query.trim() !== "" &&
    typeof note.picked === "string" &&
    SITE_PATH.test(note.picked)
  ) {
    const query = note.query.trim().slice(0, 200);
    const picked = note.picked;
    after(() => logSearch({ ...visitor, query, source: "box", picked, locale }));
  }

  return done();
}
