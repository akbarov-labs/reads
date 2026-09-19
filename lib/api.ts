import type { Translator, Book, BookWithTranslator, Author, Publisher } from "@/lib/types";
import { slugify } from "@/lib/slug";

// Server-only: read directly, never exposed to the browser bundle.
// Points at the Reads-admin Laravel API (see Reads-admin/README or the
// root README for how the two projects run together locally).
const API_URL = process.env.API_URL ?? "http://localhost:8000/api";

// The API returns image paths relative to its own origin (e.g.
// "/storage/avatars/x.jpg") rather than baking in an absolute URL, because
// it can't know which host name we used to reach it — a browser and a
// server-side fetch from inside Docker resolve "localhost" differently.
// We resolve against the same origin we used for API_URL.
const ASSET_BASE_URL = API_URL.replace(/\/api\/?$/, "");

function resolveAssetUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${ASSET_BASE_URL}${path}`;
}

// Revalidate portfolio data periodically instead of on every request or
// only at build time — translators edit their profile through the admin
// dashboard and expect changes to show up without a redeploy.
//
// This is the backstop, not the main path: Reads-admin pings /api/revalidate
// on every write (see App\Services\SiteRevalidator), which drops the cache
// entries tagged below straight away. The interval only matters if that ping
// is lost, so it can be generous rather than tight.
const REVALIDATE_SECONDS = 300;

/** Cache tag covering every page built from the translator collection. */
export const TRANSLATORS_TAG = "translators";
export const AUTHORS_TAG = "authors";
export const BOOKS_TAG = "books";
export const PUBLISHERS_TAG = "publishers";

/** Cache tag for one profile, so a single save doesn't rebuild the site. */
export function translatorTag(slug: string): string {
  return `translator:${slug}`;
}

/** Same idea for one book, now that a book has its own endpoint to invalidate. */
export function bookTag(id: string): string {
  return `book:${id}`;
}

interface ApiCollection<T> {
  data: T[];
}

interface ApiResource<T> {
  data: T;
}

/**
 * What GET /api/books returns per row: the Book fields, plus the translator
 * as a nested object rather than the flattened pair the site renders.
 *
 * `translator` is null for a book nobody has translated. Laravel's
 * whenLoaded() already collapses a loaded-but-null relation to null, so this
 * is the shape on the wire, not something we have to defend against twice.
 */
type ApiCatalogBook = Book & {
  translator?: { slug: string; name: string } | null;
};

async function apiFetch<T>(path: string, tags: string[]): Promise<T | null> {
  // Deliberately does NOT catch network errors. Returning null on failure
  // looks tidy but is worse than crashing: null renders as "this translator
  // has no data" / an empty homepage, Next treats that as a perfectly good
  // render, and caches it -- so one transient blip leaves a blank page
  // sitting in the cache until something forces a hard reload. Letting it
  // throw keeps the bad render out of the cache and surfaces the real cause
  // in the logs instead of silently showing an empty site.
  const response = await fetch(`${API_URL}${path}`, {
    next: { revalidate: REVALIDATE_SECONDS, tags },
  });

  // A genuine 404 is different: that translator really does not exist, and
  // the caller turns this into notFound().
  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Reads-admin API request failed: ${response.status} ${path}`);
  }

  return (await response.json()) as T;
}

function normalizeTranslator(translator: Translator): Translator {
  return {
    ...translator,
    avatarUrl: resolveAssetUrl(translator.avatarUrl),
    books: translator.books.map((book) => ({
      ...book,
      coverUrl: resolveAssetUrl(book.coverUrl),
      authorImageUrl: resolveAssetUrl(book.authorImageUrl) || null,
      publisherImageUrl: resolveAssetUrl(book.publisherImageUrl) || null,
    })),
  };
}

export async function getTranslators(locale: string): Promise<Translator[]> {
  const result = await apiFetch<ApiCollection<Translator>>(
    `/translators?locale=${encodeURIComponent(locale)}`,
    [TRANSLATORS_TAG]
  );
  return (result?.data ?? []).map(normalizeTranslator);
}

export async function getTranslatorBySlug(
  slug: string,
  locale: string
): Promise<Translator | null> {
  const result = await apiFetch<ApiResource<Translator>>(
    `/translators/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
    [TRANSLATORS_TAG, translatorTag(slug)]
  );
  return result?.data ? normalizeTranslator(result.data) : null;
}

function normalizeBook(book: ApiCatalogBook): BookWithTranslator {
  const { translator, ...rest } = book;

  return {
    ...rest,
    coverUrl: resolveAssetUrl(book.coverUrl),
    authorImageUrl: resolveAssetUrl(book.authorImageUrl) || null,
    publisherImageUrl: resolveAssetUrl(book.publisherImageUrl) || null,
    translatorSlug: translator?.slug ?? null,
    translatorName: translator?.name ?? null,
  };
}

/**
 * The whole book catalogue, each row carrying its translator's name and slug
 * where it has one, so listing pages can link back to the profile.
 *
 * This reads /api/books directly. It used to walk getTranslators() and flatten
 * every profile's books[], which made "book" a thing that could only exist
 * inside a translator: a book with no translator was not merely unlisted, it
 * was unreachable — absent from listings, from generateStaticParams, and so
 * from the sitemap. The catalogue endpoint owns books in their own right, so
 * they now show up whether or not anyone has translated them.
 */
export async function getAllBooks(locale: string): Promise<BookWithTranslator[]> {
  const result = await apiFetch<ApiCollection<ApiCatalogBook>>(
    `/books?locale=${encodeURIComponent(locale)}`,
    [BOOKS_TAG]
  );

  // Most recent year first.
  return (result?.data ?? [])
    .map(normalizeBook)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

/**
 * Unique authors derived from all books, sorted by book count descending.
 * The first book that has an author photo wins for the card image.
 */
export async function getAuthors(locale: string): Promise<Author[]> {
  const books = await getAllBooks(locale);
  const map = new Map<string, Author>();

  for (const book of books) {
    const key = book.author.trim();
    if (!key) continue;

    const existing = map.get(key);
    if (existing) {
      existing.bookCount += 1;
      existing.books.push(book);
      // Upgrade image if we don't have one yet.
      if (!existing.imageUrl && book.authorImageUrl) {
        existing.imageUrl = book.authorImageUrl;
      }
    } else {
      map.set(key, {
        slug: slugify(key),
        name: key,
        imageUrl: book.authorImageUrl ?? null,
        bookCount: 1,
        books: [book],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.bookCount - a.bookCount);
}

/**
 * Unique publishers derived from all books, sorted by book count descending.
 */
export async function getPublishers(locale: string): Promise<Publisher[]> {
  const books = await getAllBooks(locale);
  const map = new Map<string, Publisher>();

  for (const book of books) {
    const key = book.publisher?.trim();
    if (!key) continue;

    const existing = map.get(key);
    if (existing) {
      existing.bookCount += 1;
      existing.books.push(book);
      if (!existing.imageUrl && book.publisherImageUrl) {
        existing.imageUrl = book.publisherImageUrl;
      }
    } else {
      map.set(key, {
        slug: slugify(key),
        name: key,
        imageUrl: book.publisherImageUrl ?? null,
        bookCount: 1,
        books: [book],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.bookCount - a.bookCount);
}

export async function getBookById(
  id: string,
  locale: string
): Promise<BookWithTranslator | null> {
  const result = await apiFetch<ApiResource<ApiCatalogBook>>(
    `/books/${encodeURIComponent(id)}?locale=${encodeURIComponent(locale)}`,
    [BOOKS_TAG, bookTag(id)]
  );
  return result?.data ? normalizeBook(result.data) : null;
}

export async function getAuthorBySlug(
  slug: string,
  locale: string
): Promise<Author | null> {
  const authors = await getAuthors(locale);
  const cleanSlug = slug.toLowerCase();
  return (
    authors.find(
      (a) =>
        a.slug === cleanSlug ||
        slugify(a.name) === cleanSlug ||
        a.name.toLowerCase() === decodeURIComponent(slug).toLowerCase()
    ) ?? null
  );
}

export async function getPublisherBySlug(
  slug: string,
  locale: string
): Promise<Publisher | null> {
  const publishers = await getPublishers(locale);
  const cleanSlug = slug.toLowerCase();
  return (
    publishers.find(
      (p) =>
        p.slug === cleanSlug ||
        slugify(p.name) === cleanSlug ||
        p.name.toLowerCase() === decodeURIComponent(slug).toLowerCase()
    ) ?? null
  );
}
