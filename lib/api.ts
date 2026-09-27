import type {
  Translator,
  Book,
  BookWithTranslator,
  Author,
  Publisher,
  Taqriz,
  Taqrizchi,
  Edition,
  Category,
  Paginated,
} from "@/lib/types";

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

/** Laravel's paginated resource collection. */
interface ApiPage<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

/**
 * What GET /api/books returns per row: the Book fields, plus the primary
 * edition's first translator as a nested object rather than the flattened
 * pair the site renders.
 *
 * `translator` is null for a book nobody has translated. Laravel's
 * whenLoaded() already collapses a loaded-but-null relation to null, so this
 * is the shape on the wire, not something we have to defend against twice.
 */
type ApiCatalogBook = Book & {
  translator?: { slug: string; name: string } | null;
  taqrizlar?: Taqriz[];
  averageScore?: number | null;
  description?: string | null;
  editions?: Edition[];
  relatedBooks?: ApiCatalogBook[];
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

function normalizeEdition(edition: Edition): Edition {
  return {
    ...edition,
    coverUrl: resolveAssetUrl(edition.coverUrl),
    images: (edition.images ?? []).map((url) => resolveAssetUrl(url)),
    publisher: edition.publisher
      ? { ...edition.publisher, logoUrl: resolveAssetUrl(edition.publisher.logoUrl) || null }
      : null,
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
    editions: book.editions?.map(normalizeEdition),
    relatedBooks: book.relatedBooks?.map(normalizeBook),
  };
}

function normalizeAuthor(author: Author): Author {
  const portraitUrl = resolveAssetUrl(author.portraitUrl) || null;

  return {
    ...author,
    portraitUrl,
    imageUrl: portraitUrl,
    coverUrls: (author.coverUrls ?? []).map((url) => resolveAssetUrl(url)),
  };
}

function normalizePublisher(publisher: Publisher): Publisher {
  const logoUrl = resolveAssetUrl(publisher.logoUrl) || null;

  return {
    ...publisher,
    logoUrl,
    imageUrl: logoUrl,
    coverUrls: (publisher.coverUrls ?? []).map((url) => resolveAssetUrl(url)),
  };
}

function toPaginated<T, R>(result: ApiPage<T> | null, map: (item: T) => R): Paginated<R> {
  return {
    items: (result?.data ?? []).map(map),
    page: result?.meta.current_page ?? 1,
    lastPage: result?.meta.last_page ?? 1,
    perPage: result?.meta.per_page ?? 0,
    total: result?.meta.total ?? 0,
  };
}

function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }

  return search.toString();
}

export interface BookFilters {
  page?: number;
  perPage?: number;
  /** Title, author (either spelling) or an ISBN. */
  q?: string;
  author?: string;
  publisher?: string;
  translator?: string;
  category?: string;
  series?: string;
  sort?: "year" | "title" | "recent";
}

/**
 * One page of the catalogue. Every filter is a slug, as used in the site's
 * own URLs. The catalogue is far too big to fetch whole — Authors,
 * Publishers and "more by this author" all ask the API for exactly the page
 * they show.
 */
export async function getBooks(
  locale: string,
  filters: BookFilters = {}
): Promise<Paginated<BookWithTranslator>> {
  const { perPage, ...rest } = filters;
  const result = await apiFetch<ApiPage<ApiCatalogBook>>(
    `/books?${query({ locale, per_page: perPage, ...rest })}`,
    [BOOKS_TAG]
  );

  return toPaginated(result, normalizeBook);
}

export interface ListFilters {
  page?: number;
  perPage?: number;
  q?: string;
  sort?: "books" | "name";
}

/** Authors with at least one published book, most published first. */
export async function getAuthors(
  locale: string,
  filters: ListFilters = {}
): Promise<Paginated<Author>> {
  const { perPage, ...rest } = filters;
  const result = await apiFetch<ApiPage<Author>>(
    `/authors?${query({ locale, per_page: perPage, ...rest })}`,
    [AUTHORS_TAG, BOOKS_TAG]
  );

  return toPaginated(result, normalizeAuthor);
}

/** Publishers with at least one published edition, most published first. */
export async function getPublishers(
  locale: string,
  filters: ListFilters = {}
): Promise<Paginated<Publisher>> {
  const { perPage, ...rest } = filters;
  const result = await apiFetch<ApiPage<Publisher>>(
    `/publishers?${query({ locale, per_page: perPage, ...rest })}`,
    [PUBLISHERS_TAG, BOOKS_TAG]
  );

  return toPaginated(result, normalizePublisher);
}

/** The shelf tree (genres, audiences, lists), each with its book count. */
export async function getCategories(locale: string): Promise<Category[]> {
  const result = await apiFetch<ApiCollection<Category>>(
    `/categories?${query({ locale })}`,
    [BOOKS_TAG]
  );

  return result?.data ?? [];
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
  const result = await apiFetch<ApiResource<Author>>(
    `/authors/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
    [AUTHORS_TAG, BOOKS_TAG, authorTag(slug)]
  );
  return result?.data ? normalizeAuthor(result.data) : null;
}

export async function getPublisherBySlug(
  slug: string,
  locale: string
): Promise<Publisher | null> {
  const result = await apiFetch<ApiResource<Publisher>>(
    `/publishers/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
    [PUBLISHERS_TAG, BOOKS_TAG, publisherTag(slug)]
  );
  return result?.data ? normalizePublisher(result.data) : null;
}
