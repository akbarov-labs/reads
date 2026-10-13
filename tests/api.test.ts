import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAuthorBySlug,
  getBookById,
  getBooks,
  getPublisherBySlug,
  getSitemapIndex,
  getTaqrizchilar,
  getTranslators,
  publicAssetUrl,
} from "@/lib/api";

// vitest.config.ts pins API_URL to the production Docker address.
const INTERNAL = "http://reads-admin-app";
const PUBLIC = "https://dashboard.kitoblarim.uz";

describe("publicAssetUrl", () => {
  it("rewrites the internal Docker host to the public one", () => {
    expect(publicAssetUrl(`${INTERNAL}/storage/covers/a.jpg`)).toBe(`${PUBLIC}/storage/covers/a.jpg`);
  });

  it("keeps an absolute URL on any other host", () => {
    expect(publicAssetUrl("https://cdn.example.com/a.webp")).toBe("https://cdn.example.com/a.webp");
    expect(publicAssetUrl(`${PUBLIC}/storage/a.png`)).toBe(`${PUBLIC}/storage/a.png`);
  });

  it.each([`${INTERNAL}/storage/placeholder.svg`, "https://cdn.example.com/x.SVG?v=2"])("drops SVG %s", (url) => {
    expect(publicAssetUrl(url)).toBeUndefined();
  });

  it.each([null, undefined, ""])("is undefined for %j", (url) => {
    expect(publicAssetUrl(url)).toBeUndefined();
  });
});

describe("response normalizers", () => {
  const fetchMock = vi.fn();

  function respond(body: unknown, status = 200) {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
  }

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("resolves a book's relative image paths against the API host and flattens its translator", async () => {
    respond({
      data: {
        id: "42",
        uzbekTitle: "Oʻtgan kunlar",
        author: "Abdulla Qodiriy",
        publisher: "Sharq",
        coverUrl: "/storage/covers/42.jpg",
        authorImageUrl: null,
        publisherImageUrl: "https://cdn.example.com/sharq.png",
        translator: { slug: "ali", name: "Ali" },
        editions: [
          {
            id: "e1",
            translators: [],
            coverUrl: "/storage/e1.jpg",
            images: ["/storage/e1-back.jpg"],
            publisher: { slug: "sharq", name: "Sharq", logoUrl: null },
          },
          { id: "e2", translators: [], coverUrl: "", publisher: null },
        ],
        relatedBooks: [{ id: "7", uzbekTitle: "B", author: "C", publisher: "D", coverUrl: "/storage/7.jpg", translator: null }],
      },
    });

    const book = await getBookById("42", "uz");

    expect(fetchMock).toHaveBeenCalledWith(`${INTERNAL}/api/books/42?locale=uz`, expect.anything());
    expect(book).toMatchObject({
      coverUrl: `${INTERNAL}/storage/covers/42.jpg`,
      authorImageUrl: null,
      publisherImageUrl: "https://cdn.example.com/sharq.png",
      translatorSlug: "ali",
      translatorName: "Ali",
      taqrizlar: [],
      readerReviews: [],
    });
    expect(book).not.toHaveProperty("translator");
    expect(book?.editions?.[0]).toMatchObject({
      coverUrl: `${INTERNAL}/storage/e1.jpg`,
      images: [`${INTERNAL}/storage/e1-back.jpg`],
      publisher: { logoUrl: null },
    });
    expect(book?.editions?.[1]).toMatchObject({ coverUrl: "", images: [], publisher: null });
    expect(book?.relatedBooks?.[0]).toMatchObject({
      coverUrl: `${INTERNAL}/storage/7.jpg`,
      translatorSlug: null,
      translatorName: null,
    });
  });

  it("turns a 404 into null rather than an empty page", async () => {
    respond({ message: "Not found" }, 404);
    expect(await getBookById("missing", "uz")).toBeNull();
  });

  it("throws on a server error so the bad render is never cached", async () => {
    respond({}, 500);
    await expect(getBookById("42", "uz")).rejects.toThrow(/500/);
  });

  it("pages the catalogue, skipping empty filters", async () => {
    respond({
      data: [{ id: "1", uzbekTitle: "A", author: "B", publisher: "C", coverUrl: "/c.jpg", translator: null }],
      meta: { current_page: 2, last_page: 9, per_page: 24, total: 200 },
    });

    const page = await getBooks("ru", { page: 2, perPage: 24, q: "", author: undefined });

    expect(fetchMock.mock.calls[0][0]).toBe(`${INTERNAL}/api/books?locale=ru&per_page=24&page=2`);
    expect(page).toMatchObject({ page: 2, lastPage: 9, perPage: 24, total: 200 });
    expect(page.items[0].coverUrl).toBe(`${INTERNAL}/c.jpg`);
  });

  it("gives an author and a publisher one resolved image under both names", async () => {
    respond({ data: { slug: "a", name: "A", bookCount: 1, portraitUrl: "/p.jpg", coverUrls: ["/c1.jpg"] } });
    expect(await getAuthorBySlug("a", "uz")).toMatchObject({
      portraitUrl: `${INTERNAL}/p.jpg`,
      imageUrl: `${INTERNAL}/p.jpg`,
      coverUrls: [`${INTERNAL}/c1.jpg`],
    });

    respond({ data: { slug: "p", name: "P", bookCount: 1, logoUrl: null } });
    expect(await getPublisherBySlug("p", "uz")).toMatchObject({ logoUrl: null, imageUrl: null, coverUrls: [] });
  });

  it("resolves translators' and reviewers' images, nested ones included", async () => {
    respond({
      data: [
        {
          slug: "ali",
          avatarUrl: "/a.jpg",
          books: [{ id: "1", coverUrl: "/b.jpg", authorImageUrl: "", publisherImageUrl: "/l.png" }],
        },
      ],
    });
    const [translator] = await getTranslators("uz");
    expect(translator.avatarUrl).toBe(`${INTERNAL}/a.jpg`);
    expect(translator.books[0]).toMatchObject({
      coverUrl: `${INTERNAL}/b.jpg`,
      authorImageUrl: null,
      publisherImageUrl: `${INTERNAL}/l.png`,
    });

    respond({
      data: [
        {
          slug: "critic",
          avatarUrl: "/c.jpg",
          taqrizlar: [{ id: "7", taqrizchi: { slug: "critic", name: "C", avatarUrl: null }, book: { id: "1", coverUrl: "/b.jpg" } }],
        },
        { slug: "quiet", avatarUrl: "" },
      ],
    });
    const [critic, quiet] = await getTaqrizchilar("uz");
    expect(critic.avatarUrl).toBe(`${INTERNAL}/c.jpg`);
    expect(critic.taqrizlar[0].taqrizchi?.avatarUrl).toBeNull();
    expect(critic.taqrizlar[0].book?.coverUrl).toBe(`${INTERNAL}/b.jpg`);
    expect(quiet.taqrizlar).toEqual([]);
  });

  it("reads a missing sitemap endpoint as null", async () => {
    respond({}, 404);
    expect(await getSitemapIndex()).toBeNull();
  });
});
