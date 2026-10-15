/**
 * Where a reader can get a book. Kitoblarim holds no books, only what is
 * known about them, so a book page sends a reader who came looking for a
 * copy to these stores' own search for its title. Each address is the one
 * the store's own search box opens (checked 2026-10-15). The links are
 * plain searches, not endorsements or affiliate links.
 */
const STORES: { name: string; search: (query: string) => string }[] = [
  { name: "Asaxiy", search: (query) => `https://asaxiy.uz/product?key=${query}` },
  { name: "Book.uz", search: (query) => `https://book.uz/catalog?search=${query}` },
  { name: "Hilol-nashr", search: (query) => `https://hilolnashr.uz/index.php?route=product/search&search=${query}` },
  { name: "Qamar", search: (query) => `https://qamar.uz/?q=${query}` },
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
export function storeLinks(title: string): { name: string; url: string }[] {
  const query = encodeURIComponent(storeQuery(title));
  return STORES.map((store) => ({ name: store.name, url: store.search(query) }));
}
