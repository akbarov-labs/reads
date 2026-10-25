import { getSitemapIndex, getTaqrizchilar, getTranslators } from "@/lib/api";
import { routing } from "@/i18n/routing";
import { HREFLANG, SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * The sitemap, as an index of files by kind (Google reads at most 50,000
 * URLs per file, and the catalogue's books alone, in three languages, pass
 * that). Each page is listed once per language with its hreflang siblings,
 * matching the <link rel="alternate"> tags on the page itself: a sitemap that
 * disagrees with the page is a signal Google resolves by ignoring both.
 */

// 5,000 books × 3 languages = 15,000 URLs a file.
export const BOOKS_PER_FILE = 5000;

type Entry = { path: string; lastModified?: string | null };

function escape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function isoDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function urlsetXml(entries: Entry[]): string {
  const urls: string[] = [];
  for (const entry of entries) {
    const links = [
      ...routing.locales.map(
        (other) => `<xhtml:link rel="alternate" hreflang="${HREFLANG[other]}" href="${escape(absoluteUrl(other, entry.path))}"/>`,
      ),
      `<xhtml:link rel="alternate" hreflang="x-default" href="${escape(absoluteUrl(routing.defaultLocale, entry.path))}"/>`,
    ].join("");
    const lastmod = isoDate(entry.lastModified);
    for (const locale of routing.locales) {
      urls.push(
        `<url><loc>${escape(absoluteUrl(locale, entry.path))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}${links}</url>`,
      );
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join("")}</urlset>`;
}

export function indexXml(names: string[]): string {
  const items = names.map((name) => `<sitemap><loc>${escape(`${SITE_URL}/sitemaps/${name}.xml`)}</loc></sitemap>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items.join("")}</sitemapindex>`;
}

/** The files the index lists: always the pages, plus the catalogue once reads-admin serves it. */
export async function sitemapNames(): Promise<string[]> {
  const index = await getSitemapIndex();
  if (!index) return ["pages"];
  const bookFiles = Math.ceil(index.books.length / BOOKS_PER_FILE);
  return [
    "pages",
    ...(index.authors.length ? ["authors"] : []),
    ...(index.publishers.length ? ["publishers"] : []),
    ...(index.collections?.length ? ["collections"] : []),
    ...(index.libraries?.length ? ["libraries"] : []),
    ...Array.from({ length: bookFiles }, (_, i) => `books-${i + 1}`),
  ];
}

/** The entries of one file, or null for a name the index never lists. */
export async function sitemapEntries(name: string): Promise<Entry[] | null> {
  if (name === "pages") return pageEntries();

  const index = await getSitemapIndex();
  if (!index) return null;
  if (name === "authors") return index.authors.map((a) => ({ path: `/author/${a.slug}`, lastModified: a.updatedAt }));
  if (name === "publishers") return index.publishers.map((p) => ({ path: `/publisher/${p.slug}`, lastModified: p.updatedAt }));
  if (name === "collections" && index.collections?.length) {
    // The list page goes with them: it has nothing to show until there are some.
    const newest = index.collections.map((c) => c.updatedAt).filter(Boolean).sort().at(-1) ?? null;
    return [
      { path: "/collections", lastModified: newest },
      ...index.collections.map((c) => ({ path: `/collection/${c.slug}`, lastModified: c.updatedAt })),
    ];
  }

  if (name === "libraries" && index.libraries?.length) {
    // As with collections, the list page has nothing to show until there are some.
    const newest = index.libraries.map((l) => l.updatedAt).filter(Boolean).sort().at(-1) ?? null;
    return [
      { path: "/libraries", lastModified: newest },
      ...index.libraries.map((l) => ({ path: `/library/${l.slug}`, lastModified: l.updatedAt })),
    ];
  }

  const match = /^books-(\d+)$/.exec(name);
  if (!match) return null;
  const n = Number(match[1]);
  const slice = index.books.slice((n - 1) * BOOKS_PER_FILE, n * BOOKS_PER_FILE);
  if (n < 1 || slice.length === 0) return null;
  return slice.map((b) => ({ path: `/book/${b.id}`, lastModified: b.updatedAt }));
}

/** Home, the listings, translator and reviewer profiles, and every taqriz. */
async function pageEntries(): Promise<Entry[]> {
  const [translators, taqrizchilar] = await Promise.all([
    getTranslators(routing.defaultLocale),
    getTaqrizchilar(routing.defaultLocale),
  ]);

  // A profile marked "hide from search engines" in the admin panel carries
  // noindex on the page itself; listing it would send Google to a page that
  // then refuses to be indexed.
  const indexable = translators.filter((translator) => !translator.seo?.noindex);
  const newest = indexable.map((translator) => translator.updatedAt).filter(Boolean).sort().at(-1) ?? null;

  return [
    { path: "", lastModified: newest },
    { path: "/books" },
    { path: "/authors" },
    { path: "/publishers" },
    { path: "/translators", lastModified: newest },
    { path: "/taqrizchilar" },
    ...indexable.map((translator) => ({ path: `/translator/${translator.slug}`, lastModified: translator.updatedAt })),
    ...taqrizchilar.map((taqrizchi) => ({ path: `/taqrizchi/${taqrizchi.slug}`, lastModified: taqrizchi.updatedAt })),
    ...taqrizchilar.flatMap((taqrizchi) =>
      taqrizchi.taqrizlar.map((taqriz) => ({ path: `/taqriz/${taqriz.id}`, lastModified: taqriz.updatedAt })),
    ),
  ];
}
