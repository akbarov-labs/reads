import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { TRANSLATORS_TAG, translatorTag } from "@/lib/api";

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

  try {
    const body = (await request.json()) as { slug?: unknown };

    // Only a well-formed slug is accepted — the value is used to build a
    // cache tag, and an unbounded string there is a cache-key pollution
    // vector rather than a useful request.
    if (typeof body.slug === "string" && /^[a-z0-9-]{1,255}$/i.test(body.slug)) {
      slug = body.slug;
    }
  } catch {
    // A body-less ping is valid: it means "the collection changed".
  }

  // The collection tag always goes: the home page, the sitemap and llms.txt
  // all list every translator, so any single change can alter them.
  revalidateTag(TRANSLATORS_TAG);

  if (slug) {
    revalidateTag(translatorTag(slug));
  }

  return Response.json({ revalidated: true, slug: slug ?? null });
}
