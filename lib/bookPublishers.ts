import type { BookWithTranslator } from "@/lib/types";

export interface BookPublisher {
  slug: string | null;
  name: string;
  /** The newest year this publisher printed the book, when known. */
  year: number | null;
}

/**
 * Who published the book, for the facts at the top of its page: every
 * publisher that has a printing, once each, in the order the printings are
 * listed. A book printed by two houses names both, so a reader arriving from
 * either publisher's page finds that publisher there. A book with no
 * editions loaded falls back to the card's own publisher.
 */
export function bookPublishers(book: BookWithTranslator): BookPublisher[] {
  const seen = new Map<string, BookPublisher>();

  for (const edition of book.editions ?? []) {
    if (!edition.publisher?.name) continue;
    const known = seen.get(edition.publisher.slug);
    const year = edition.year ?? null;
    if (!known) {
      seen.set(edition.publisher.slug, { slug: edition.publisher.slug, name: edition.publisher.name, year });
    } else if (year !== null && (known.year === null || year > known.year)) {
      known.year = year;
    }
  }

  if (seen.size > 0) return Array.from(seen.values());
  if (!book.publisher) return [];
  return [{ slug: book.publisherSlug ?? null, name: book.publisher, year: book.year ?? null }];
}
