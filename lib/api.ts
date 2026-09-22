import type {
  Translator,
  Book,
  BookWithTranslator,
  Author,
  Publisher,
  Taqriz,
  Taqrizchi,
} from "@/lib/types";
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

export const TAQRIZCHILAR_TAG = "taqrizchilar";

/** One reviewer's page, so publishing a review doesn't rebuild every profile. */
export function taqrizchiTag(slug: string): string {
  return `taqrizchi:${slug}`;
}

/** One author's page, so saving one author doesn't rebuild the whole list. */
export function authorTag(slug: string): string {
  return `author:${slug}`;
}

/** One publisher's page, so saving one publisher doesn't rebuild the whole list. */
export function publisherTag(slug: string): string {
  return `publisher:${slug}`;
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
  taqrizlar?: Taqriz[];
  averageScore?: number | null;
};

/**
 * What GET /api/authors and GET /api/publishers return per row: the profile
 * fields Reads-admin owns, plus a `bookCount` it computes itself. Neither
 * nests its books — the site cross-references them against getAllBooks() by
 * id, so a profile with zero books (a publisher just created, before their
 * first book is added) still has somewhere to exist.
 */
type ApiAuthor = Omit<Author, "books" | "imageUrl">;
type ApiPublisher = Omit<Publisher, "books" | "imageUrl">;

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

function normalizeTaqriz(taqriz: Taqriz): Taqriz {
  return {
    ...taqriz,
    taqrizchi: taqriz.taqrizchi
      ? {
          ...taqriz.taqrizchi,
          avatarUrl: resolveAssetUrl(taqriz.taqrizchi.avatarUrl) || null,
        }
      : taqriz.taqrizchi,
    book: taqriz.book
      ? { ...taqriz.book, coverUrl: resolveAssetUrl(taqriz.book.coverUrl) || null }
      : taqriz.book,
  };
}

function normalizeTaqrizchi(taqrizchi: Taqrizchi): Taqrizchi {
  return {
    ...taqrizchi,
    avatarUrl: resolveAssetUrl(taqrizchi.avatarUrl),
    taqrizlar: (taqrizchi.taqrizlar ?? []).map(normalizeTaqriz),
  };
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
    taqrizlar: (book.taqrizlar ?? []).map(normalizeTaqriz),
  };
}

function normalizeAuthor(author: ApiAuthor, books: BookWithTranslator[]): Author {
  const ownBooks = books.filter(
    (b) => (author.id && b.authorId === author.id) || b.author.trim() === author.name.trim()
  );

  return {
    ...author,
    portraitUrl: resolveAssetUrl(author.portraitUrl) || null,
    imageUrl:
      resolveAssetUrl(author.portraitUrl) || ownBooks[0]?.authorImageUrl || null,
    books: ownBooks,
  };
}

function normalizePublisher(
  publisher: ApiPublisher,
  books: BookWithTranslator[]
): Publisher {
  const ownBooks = books.filter(
    (b) =>
      (publisher.id && b.publisherId === publisher.id) ||
      b.publisher?.trim() === publisher.name.trim()
  );

  return {
    ...publisher,
    logoUrl: resolveAssetUrl(publisher.logoUrl) || null,
    imageUrl:
      resolveAssetUrl(publisher.logoUrl) || ownBooks[0]?.publisherImageUrl || null,
    books: ownBooks,
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
 * Every author, straight from Reads-admin's own /api/authors — including one
 * with zero books yet, which the old book-derived list could never show:
 * grouping books by author name meant an author only existed once their
 * first book did.
 */
export async function getAuthors(locale: string): Promise<Author[]> {
  const [result, books] = await Promise.all([
    apiFetch<ApiCollection<ApiAuthor>>(
      `/authors?locale=${encodeURIComponent(locale)}`,
      [AUTHORS_TAG]
    ),
    getAllBooks(locale),
  ]);

  return (result?.data ?? [])
    .map((author) => normalizeAuthor(author, books))
    .sort((a, b) => b.bookCount - a.bookCount);
}

/**
 * Every publisher, straight from Reads-admin's own /api/publishers. Same
 * reasoning as getAuthors: a publisher added before their first book exists
 * on the site now has somewhere to appear.
 */
export async function getPublishers(locale: string): Promise<Publisher[]> {
  const [result, books] = await Promise.all([
    apiFetch<ApiCollection<ApiPublisher>>(
      `/publishers?locale=${encodeURIComponent(locale)}`,
      [PUBLISHERS_TAG]
    ),
    getAllBooks(locale),
  ]);

  return (result?.data ?? [])
    .map((publisher) => normalizePublisher(publisher, books))
    .sort((a, b) => b.bookCount - a.bookCount);
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

/**
 * Every reviewer, for the /taqrizchilar listing. The API only ever loads
 * approved reviews, so counts and lists here are already public-safe.
 */
export async function getTaqrizchilar(locale: string): Promise<Taqrizchi[]> {
  const result = await apiFetch<ApiCollection<Taqrizchi>>(
    `/taqrizchilar?locale=${encodeURIComponent(locale)}`,
    [TAQRIZCHILAR_TAG]
  );
  return (result?.data ?? []).map(normalizeTaqrizchi);
}

export async function getTaqrizchiBySlug(
  slug: string,
  locale: string
): Promise<Taqrizchi | null> {
  const result = await apiFetch<ApiResource<Taqrizchi>>(
    `/taqrizchilar/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
    [TAQRIZCHILAR_TAG, taqrizchiTag(slug)]
  );
  return result?.data ? normalizeTaqrizchi(result.data) : null;
}

/**
 * One review at its own permalink. An unapproved taqriz is a 404 from the
 * API, which this turns into null and the page turns into notFound().
 */
export async function getTaqrizById(
  id: string,
  locale: string
): Promise<Taqriz | null> {
  const result = await apiFetch<ApiResource<Taqriz>>(
    `/taqrizlar/${encodeURIComponent(id)}?locale=${encodeURIComponent(locale)}`,
    [TAQRIZCHILAR_TAG]
  );
  return result?.data ? normalizeTaqriz(result.data) : null;
}

export async function getAuthorBySlug(
  slug: string,
  locale: string
): Promise<Author | null> {
  const [result, books] = await Promise.all([
    apiFetch<ApiResource<ApiAuthor>>(
      `/authors/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
      [AUTHORS_TAG, authorTag(slug)]
    ),
    getAllBooks(locale),
  ]);

  if (result?.data) return normalizeAuthor(result.data, books);

  // Book pages link to /author/{slugify(book.author)} rather than a real
  // author slug (a book only carries the author's name and id, not their
  // slug). That client-computed slug usually matches the real one, but isn't
  // guaranteed to for every name, so a 404 above falls back to matching by
  // name against the full list before giving up.
  const cleanSlug = slug.toLowerCase();
  const authors = await getAuthors(locale);
  return (
    authors.find(
      (a) =>
        slugify(a.name) === cleanSlug ||
        a.name.toLowerCase() === decodeURIComponent(slug).toLowerCase()
    ) ?? null
  );
}

export async function getPublisherBySlug(
  slug: string,
  locale: string
): Promise<Publisher | null> {
  const [result, books] = await Promise.all([
    apiFetch<ApiResource<ApiPublisher>>(
      `/publishers/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
      [PUBLISHERS_TAG, publisherTag(slug)]
    ),
    getAllBooks(locale),
  ]);

  if (result?.data) return normalizePublisher(result.data, books);

  // Same fallback as getAuthorBySlug, and for the same reason: book pages
  // link to /publisher/{slugify(book.publisher)}, a client-computed guess.
  const cleanSlug = slug.toLowerCase();
  const publishers = await getPublishers(locale);
  return (
    publishers.find(
      (p) =>
        slugify(p.name) === cleanSlug ||
        p.name.toLowerCase() === decodeURIComponent(slug).toLowerCase()
    ) ?? null
  );
}
