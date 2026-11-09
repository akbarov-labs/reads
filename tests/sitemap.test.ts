import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SitemapIndex } from "@/lib/api";
import type { Taqrizchi, Translator } from "@/lib/types";
import { BOOKS_PER_FILE, indexXml, sitemapEntries, sitemapNames, urlsetXml } from "@/lib/sitemap";

const api = vi.hoisted(() => ({
  getSitemapIndex: vi.fn(),
  getTranslators: vi.fn(),
  getTaqrizchilar: vi.fn(),
}));
// Hoisted above the imports, so lib/sitemap sees the mock, never the network.
vi.mock("@/lib/api", () => api);

const ORIGIN = "https://kitoblarim.uz";

function index(books: number, { authors = 1, publishers = 1 } = {}): SitemapIndex {
  return {
    books: Array.from({ length: books }, (_, i) => ({ id: String(i + 1), updatedAt: "2026-10-01T10:00:00Z" })),
    authors: Array.from({ length: authors }, (_, i) => ({ slug: `author-${i + 1}`, updatedAt: null })),
    publishers: Array.from({ length: publishers }, (_, i) => ({ slug: `publisher-${i + 1}`, updatedAt: "2026-09-01" })),
  };
}

/** The <url> blocks of a urlset, each as its text. */
function urls(xml: string): string[] {
  return xml.match(/<url>.*?<\/url>/g) ?? [];
}

beforeEach(() => {
  vi.resetAllMocks();
  api.getTranslators.mockResolvedValue([]);
  api.getTaqrizchilar.mockResolvedValue([]);
});

describe("urlsetXml", () => {
  const xml = urlsetXml([{ path: "/book/42", lastModified: "2026-10-01T10:00:00Z" }]);

  it("declares the sitemap and xhtml namespaces", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });

  it("lists the page once per locale", () => {
    const locs = urls(xml).map((url) => /<loc>(.*?)<\/loc>/.exec(url)?.[1]);
    expect(locs).toEqual([`${ORIGIN}/uz/book/42`, `${ORIGIN}/ru/book/42`, `${ORIGIN}/en/book/42`]);
  });

  it("gives every <url> all hreflang siblings and x-default, matching the page's own tags", () => {
    for (const url of urls(xml)) {
      const links = [...url.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(([, lang, href]) => [lang, href]);
      expect(links).toEqual([
        ["uz-UZ", `${ORIGIN}/uz/book/42`],
        ["ru-RU", `${ORIGIN}/ru/book/42`],
        ["en", `${ORIGIN}/en/book/42`],
        ["x-default", `${ORIGIN}/uz/book/42`],
      ]);
    }
  });

  it("writes lastmod as an ISO date", () => {
    for (const url of urls(xml)) expect(url).toContain("<lastmod>2026-10-01T10:00:00.000Z</lastmod>");
  });

  it.each([null, undefined, "", "not a date"])("leaves lastmod out for %j", (lastModified) => {
    expect(urlsetXml([{ path: "/books", lastModified }])).not.toContain("<lastmod>");
  });

  it("escapes XML in URLs", () => {
    const escaped = urlsetXml([{ path: '/translator/a&b<c>"d' }]);
    expect(escaped).toContain(`<loc>${ORIGIN}/uz/translator/a&amp;b&lt;c&gt;&quot;d</loc>`);
    expect(escaped).not.toMatch(/&(?!amp;|lt;|gt;|quot;)/);
    expect(escaped).not.toContain('a&b');
  });

  it("lists a page limited to some locales only there, still naming every hreflang sibling", () => {
    const limited = urls(urlsetXml([{ path: "/book/42", locales: ["uz"] }]));
    expect(limited).toHaveLength(1);
    expect(limited[0]).toContain(`<loc>${ORIGIN}/uz/book/42</loc>`);
    const links = [...limited[0].matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(([, lang]) => lang);
    expect(links).toEqual(["uz-UZ", "ru-RU", "en", "x-default"]);
  });

  it("is an empty urlset for no entries", () => {
    expect(urls(urlsetXml([]))).toEqual([]);
  });
});

describe("indexXml", () => {
  it("points at each file under /sitemaps", () => {
    const xml = indexXml(["pages", "books-1"]);
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<sitemap><loc>${ORIGIN}/sitemaps/pages.xml</loc></sitemap>`);
    expect(xml).toContain(`<sitemap><loc>${ORIGIN}/sitemaps/books-1.xml</loc></sitemap>`);
  });
});

describe("sitemapNames", () => {
  it("lists only the pages while reads-admin has no sitemap endpoint", async () => {
    api.getSitemapIndex.mockResolvedValue(null);
    expect(await sitemapNames()).toEqual(["pages"]);
  });

  it("splits books into files of 5,000", async () => {
    expect(BOOKS_PER_FILE).toBe(5000);
    api.getSitemapIndex.mockResolvedValue(index(12_345));
    expect(await sitemapNames()).toEqual(["pages", "authors", "publishers", "books-1", "books-2", "books-3"]);
  });

  it("keeps exactly-full files exact", async () => {
    api.getSitemapIndex.mockResolvedValue(index(10_000));
    expect((await sitemapNames()).filter((name) => name.startsWith("books-"))).toEqual(["books-1", "books-2"]);
  });

  it("leaves out empty kinds", async () => {
    api.getSitemapIndex.mockResolvedValue(index(0, { authors: 0, publishers: 0 }));
    expect(await sitemapNames()).toEqual(["pages"]);
  });
});

describe("sitemapEntries", () => {
  it("chunks books 5,000 to a file, in order, with nothing lost", async () => {
    api.getSitemapIndex.mockResolvedValue(index(12_345));
    const first = await sitemapEntries("books-1");
    const last = await sitemapEntries("books-3");
    expect(first).toHaveLength(5000);
    expect(first?.[0]).toEqual({ path: "/book/1", lastModified: "2026-10-01T10:00:00Z", locales: ["uz"] });
    expect(first?.at(-1)?.path).toBe("/book/5000");
    expect((await sitemapEntries("books-2"))?.[0].path).toBe("/book/5001");
    expect(last).toHaveLength(2345);
    expect(last?.at(-1)?.path).toBe("/book/12345");
  });

  it("maps authors and publishers to their pages", async () => {
    api.getSitemapIndex.mockResolvedValue(index(1));
    expect(await sitemapEntries("authors")).toEqual([{ path: "/author/author-1", lastModified: null, locales: ["uz"] }]);
    expect(await sitemapEntries("publishers")).toEqual([{ path: "/publisher/publisher-1", lastModified: "2026-09-01" }]);
  });

  it("lists book and author pages in Uzbek only, everything else in every language", async () => {
    api.getSitemapIndex.mockResolvedValue(index(2));
    const locs = async (name: string) =>
      urls(urlsetXml((await sitemapEntries(name)) ?? [])).map((url) => /<loc>(.*?)<\/loc>/.exec(url)?.[1]);

    expect(await locs("books-1")).toEqual([`${ORIGIN}/uz/book/1`, `${ORIGIN}/uz/book/2`]);
    expect(await locs("authors")).toEqual([`${ORIGIN}/uz/author/author-1`]);
    expect(await locs("publishers")).toEqual([
      `${ORIGIN}/uz/publisher/publisher-1`,
      `${ORIGIN}/ru/publisher/publisher-1`,
      `${ORIGIN}/en/publisher/publisher-1`,
    ]);
  });

  it("lists collections with their list page, once there are some", async () => {
    api.getSitemapIndex.mockResolvedValue({
      ...index(1),
      collections: [
        { slug: "yil-tarjimalari", updatedAt: "2026-10-18T09:00:00Z" },
        { slug: "dostoyevskiy", updatedAt: "2026-10-01T09:00:00Z" },
      ],
    });
    expect(await sitemapNames()).toEqual(["pages", "authors", "publishers", "collections", "books-1"]);
    expect(await sitemapEntries("collections")).toEqual([
      { path: "/collections", lastModified: "2026-10-18T09:00:00Z" },
      { path: "/collection/yil-tarjimalari", lastModified: "2026-10-18T09:00:00Z" },
      { path: "/collection/dostoyevskiy", lastModified: "2026-10-01T09:00:00Z" },
    ]);

    // None yet, or an admin that does not send them: no file at all.
    api.getSitemapIndex.mockResolvedValue({ ...index(1), collections: [] });
    expect(await sitemapNames()).not.toContain("collections");
    expect(await sitemapEntries("collections")).toBeNull();
    api.getSitemapIndex.mockResolvedValue(index(1));
    expect(await sitemapEntries("collections")).toBeNull();
  });

  it("lists libraries with their list page, once there are some", async () => {
    api.getSitemapIndex.mockResolvedValue({
      ...index(1),
      libraries: [
        { slug: "mehr", updatedAt: "2026-10-24T09:00:00Z" },
        { slug: "idrok", updatedAt: "2026-10-20T09:00:00Z" },
      ],
    });
    expect(await sitemapNames()).toEqual(["pages", "authors", "publishers", "libraries", "books-1"]);
    expect(await sitemapEntries("libraries")).toEqual([
      { path: "/libraries", lastModified: "2026-10-24T09:00:00Z" },
      { path: "/library/mehr", lastModified: "2026-10-24T09:00:00Z" },
      { path: "/library/idrok", lastModified: "2026-10-20T09:00:00Z" },
    ]);

    api.getSitemapIndex.mockResolvedValue(index(1));
    expect(await sitemapNames()).not.toContain("libraries");
    expect(await sitemapEntries("libraries")).toBeNull();
  });

  it.each(["books-0", "books-4", "books-x", "books-", "books", "nope", "", "../pages"])("is null for %j", async (name) => {
    api.getSitemapIndex.mockResolvedValue(index(12_345));
    expect(await sitemapEntries(name)).toBeNull();
  });

  it("is null for every catalogue file while the index is missing", async () => {
    api.getSitemapIndex.mockResolvedValue(null);
    expect(await sitemapEntries("books-1")).toBeNull();
    expect(await sitemapEntries("authors")).toBeNull();
  });

  it("serves pages without the catalogue index, leaving out noindex profiles", async () => {
    api.getSitemapIndex.mockResolvedValue(null);
    api.getTranslators.mockResolvedValue([
      { slug: "shown", updatedAt: "2026-08-01", seo: { noindex: false } },
      { slug: "hidden", updatedAt: "2026-10-01", seo: { noindex: true } },
      { slug: "no-seo", updatedAt: null, seo: null },
    ] as unknown as Translator[]);
    api.getTaqrizchilar.mockResolvedValue([
      { slug: "critic", updatedAt: "2026-07-01", taqrizlar: [{ id: "7", updatedAt: "2026-07-02" }] },
    ] as unknown as Taqrizchi[]);

    const entries = await sitemapEntries("pages");
    const paths = entries?.map((entry) => entry.path);

    expect(api.getSitemapIndex).not.toHaveBeenCalled();
    expect(paths).toEqual([
      "",
      "/books",
      "/authors",
      "/publishers",
      "/translators",
      "/taqrizchilar",
      "/translator/shown",
      "/translator/no-seo",
      "/taqrizchi/critic",
      "/taqriz/7",
    ]);
    // The home page's date is the newest indexable profile's, not the hidden one's.
    expect(entries?.[0].lastModified).toBe("2026-08-01");
  });
});
