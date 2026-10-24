/**
 * The search box's suggestions: what /api/search (app/api/search/route.ts)
 * hands the browser, and the pure helpers the box is built from. No server
 * imports here: SearchBox, a client component, uses all of it.
 *
 * The shape mirrors Reads-admin's GET /api/search (SearchController), with
 * image paths already resolved by the route.
 */

export interface SearchBook {
  id: string;
  uzbekTitle: string;
  originalTitle: string | null;
  author: string;
  year: number | null;
  coverUrl: string | null;
}

export interface SearchPerson {
  slug: string;
  name: string;
  imageUrl: string | null;
  bookCount: number;
}

export interface SearchGroup<T> {
  items: T[];
  total: number;
}

export interface SearchResults {
  books: SearchGroup<SearchBook>;
  authors: SearchGroup<SearchPerson>;
  translators: SearchGroup<SearchPerson>;
  publishers: SearchGroup<SearchPerson>;
}

export type SearchKind = keyof SearchResults;

/** Display order, best-known first: most readers come for a book. */
export const SEARCH_KINDS: SearchKind[] = ["books", "authors", "translators", "publishers"];

/** Shorter than this, Reads-admin answers with empty groups; no need to ask. */
export const MIN_QUERY_LENGTH = 2;

/** Long enough for a title and an author; anything longer is pasted, not typed. */
export const MAX_QUERY_LENGTH = 100;

/** Wait this long after the last keystroke, so a word typed is one request, not six. */
export const DEBOUNCE_MS = 250;

export const EMPTY_RESULTS: SearchResults = {
  books: { items: [], total: 0 },
  authors: { items: [], total: 0 },
  translators: { items: [], total: 0 },
  publishers: { items: [], total: 0 },
};

/**
 * The query as worth asking about: trimmed, single-spaced, lowercased,
 * capped. Reads-admin folds case, alphabet and apostrophes itself; this is
 * only so "Dengiz", "dengiz " and "DENGIZ" are one cache entry. Empty when
 * it is too short to search.
 */
export function normalizeQuery(raw: string): string {
  const query = raw.replace(/\s+/g, " ").trim().toLowerCase().slice(0, MAX_QUERY_LENGTH).trim();

  return Array.from(query.replace(/[^\p{L}\p{N}]/gu, "")).length >= MIN_QUERY_LENGTH ? query : "";
}

/** Where a suggestion leads, before the locale prefix. */
export function suggestionPath(kind: SearchKind, item: SearchBook | SearchPerson): string {
  switch (kind) {
    case "books":
      return `/book/${(item as SearchBook).id}`;
    case "authors":
      return `/author/${(item as SearchPerson).slug}`;
    case "translators":
      return `/translator/${(item as SearchPerson).slug}`;
    case "publishers":
      return `/publisher/${(item as SearchPerson).slug}`;
  }
}

/** The full results page the box falls back to: the books listing, as the form without JavaScript. */
export function allResultsPath(query: string): string {
  return `/books?${new URLSearchParams({ q: query.trim() })}`;
}

export interface SearchOption {
  id: string;
  kind: SearchKind | "all";
  path: string;
}

/**
 * Every suggestion in the order the arrow keys walk them, group by group,
 * then "all results" last. Empty when there is nothing to suggest.
 */
export function searchOptions(results: SearchResults, query: string): SearchOption[] {
  const options: SearchOption[] = SEARCH_KINDS.flatMap((kind) =>
    (results[kind].items as (SearchBook | SearchPerson)[]).map((item) => ({
      id: `${kind}-${"id" in item ? item.id : item.slug}`,
      kind,
      path: suggestionPath(kind, item),
    })),
  );

  return options.length > 0 ? [...options, { id: "all", kind: "all", path: allResultsPath(query) }] : [];
}

/** The next highlighted option for an arrow key: wraps at either end, -1 means none. */
export function moveActive(active: number, count: number, key: "ArrowDown" | "ArrowUp"): number {
  if (count === 0) return -1;
  if (key === "ArrowDown") return active + 1 >= count ? 0 : active + 1;

  return active <= 0 ? count - 1 : active - 1;
}
