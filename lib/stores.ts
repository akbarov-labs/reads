/**
 * Where a reader can get a book. Kitoblarim holds no books, only what is
 * known about them, so a book page sends a reader who came looking for a
 * copy to these stores' own search for its title. Each address is the one
 * the store's own search box opens (checked 2026-10-15). The links are
 * plain searches, not endorsements or affiliate links.
 *
 * `key` names the store in the click log (see /go/store) and on the admin's
 * Store clicks page, so it stays the same if a store's name or address
 * changes.
 */
const STORES: { key: string; name: string; search: (query: string) => string }[] = [
  { key: "asaxiy", name: "Asaxiy", search: (query) => `https://asaxiy.uz/product?key=${query}` },
  { key: "book.uz", name: "Book.uz", search: (query) => `https://book.uz/catalog?search=${query}` },
  { key: "hilol-nashr", name: "Hilol-nashr", search: (query) => `https://hilolnashr.uz/index.php?route=product/search&search=${query}` },
  { key: "qamar", name: "Qamar", search: (query) => `https://qamar.uz/?q=${query}` },
];

/**
 * What to search the stores for: the title without its bracketed parts.
 * "Tazarru (Tergovchi)" finds nothing on Book.uz, "Tazarru" finds it.
 */
export function storeQuery(title: string): string {
  const bare = title.replace(/\s*[(\[][^)\]]*[)\]]/g, " ").replace(/\s+/g, " ").trim();
  return bare || title.trim();
}

/** Each store's search for this title, in the order the page lists them. */
export function storeLinks(title: string): { key: string; name: string; url: string }[] {
  const query = encodeURIComponent(storeQuery(title));
  return STORES.map((store) => ({ key: store.key, name: store.name, url: store.search(query) }));
}

/** One store's search for this title, or null for a store this site doesn't list. */
export function storeSearchUrl(key: string, title: string): string | null {
  const store = STORES.find((candidate) => candidate.key === key);
  return store ? store.search(encodeURIComponent(storeQuery(title))) : null;
}

/**
 * Where a book page's store link points: this site's own redirect, which
 * counts the click and sends the reader on to the store's search. A plain
 * link, so it counts without JavaScript too.
 */
export function storeRedirectPath(key: string, bookId: string, locale: string): string {
  return `/go/store/${encodeURIComponent(key)}/${encodeURIComponent(bookId)}?l=${encodeURIComponent(locale)}`;
}
