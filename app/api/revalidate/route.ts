import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import {
  BOOKS_TAG,
  TAQRIZCHILAR_TAG,
  TRANSLATORS_TAG,
  bookTag,
  taqrizchiTag,
  translatorTag,
} from "@/lib/api";

/**
 * Webhook Reads-admin calls after any write to a translator, book, language
 * pair or social link (see App\Services\SiteRevalidator). Dropping the cache
 * tag rebuilds the affected pages — and the sitemap and llms.txt built from
 * the same fetch — on the next request, instead of waiting out the ISR
 * window. A new book is therefore indexable within seconds of being saved.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Compares two secrets without leaking, through response timing, how much of
 * a guess was correct. Hashing first means the comparison is over two equal
 * 32-byte buffers, so it also does not leak the secret's length.
 */
function secretMatches(provided: string, expected: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();

  return timingSafeEqual(digest(provided), digest(expected));
}

export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET;

  // Unset means the webhook is not provisioned. Refusing outright is the
  // safe reading: an empty secret must never be treated as "no auth needed".
  if (!expected) {
    return Response.json({ revalidated: false }, { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!provided || !secretMatches(provided, expected)) {
    // Deliberately terse: no hint about which part was wrong.
    return Response.json({ revalidated: false }, { status: 401 });
  }

  let slug: string | undefined;
  let id: string | undefined;
  let type: "translator" | "taqrizchi" | "book" | undefined;

  try {
    const body = (await request.json()) as {
      slug?: unknown;
      id?: unknown;
      type?: unknown;
    };

    // Only a well-formed slug is accepted — the value is used to build a
    // cache tag, and an unbounded string there is a cache-key pollution
    // vector rather than a useful request.
    if (typeof body.slug === "string" && /^[a-z0-9-]{1,255}$/i.test(body.slug)) {
      slug = body.slug;
    }

    if (typeof body.id === "string" && /^[0-9]{1,20}$/.test(body.id)) {
      id = body.id;
    }

    // Which kind of thing the slug names. Without it a taqrizchi and a
    // translator who happen to share a slug would invalidate each other's
    // page and neither their own.
    if (
      body.type === "translator" ||
      body.type === "taqrizchi" ||
      body.type === "book"
    ) {
      type = body.type;
    }
  } catch {
    // A body-less ping is valid: it means "the collection changed".
  }

  // The collection tags always go. The home page, the sitemap and llms.txt
  // each list everything, so any single change can alter them, and the
  // Authors and Publishers pages are derived from the book catalogue.
  //
  // BOOKS_TAG is listed explicitly because getAllBooks() reads /api/books
  // directly. It used to inherit TRANSLATORS_TAG by walking getTranslators(),
  // and without this a saved book would wait out the full ISR window instead
  // of appearing within seconds.
  revalidateTag(TRANSLATORS_TAG);
  revalidateTag(BOOKS_TAG);
  revalidateTag(TAQRIZCHILAR_TAG);

  // Then the one page that actually changed, where the ping says which.
  if (type === "book" && id) {
    revalidateTag(bookTag(id));
  } else if (type === "taqrizchi" && slug) {
    revalidateTag(taqrizchiTag(slug));
  } else if (slug) {
    // Explicitly a translator, or an older caller that sent a bare slug
    // before `type` existed.
    revalidateTag(translatorTag(slug));
  }

  return Response.json({
    revalidated: true,
    type: type ?? null,
    slug: slug ?? null,
    id: id ?? null,
  });
}
