import { describe, expect, it } from "vitest";
import { authorPageGraph, bookPageGraph, languageCodes, publisherPageGraph, siteGraph } from "@/lib/jsonld";
import type { Author, BookWithTranslator, Publisher } from "@/lib/types";

const ORIGIN = "https://kitoblarim.uz";
const INTERNAL = "http://reads-admin-app";
const PUBLIC = "https://dashboard.kitoblarim.uz";

type Node = Record<string, unknown>;
type Graph = { "@context": string; "@graph": Node[] };

/** The graph as a crawler reads it: JSON, where undefined keys vanish. */
function json(graph: unknown): Graph {
  return JSON.parse(JSON.stringify(graph));
}

/** Paths to every null, empty string, empty array or empty object anywhere in the graph. */
function emptyValues(value: unknown, path = "$"): string[] {
  if (value === null || value === "") return [path];
  if (Array.isArray(value)) {
    return value.length === 0 ? [path] : value.flatMap((item, i) => emptyValues(item, `${path}[${i}]`));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Node);
    return entries.length === 0 ? [path] : entries.flatMap(([key, item]) => emptyValues(item, `${path}.${key}`));
  }
  if (typeof value === "string" && /\b(null|undefined|NaN)\b/.test(value)) return [path];
  return [];
}

/** Every { "@id": x } reference: an object that only points at another node. */
function references(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(references);
  if (!value || typeof value !== "object") return [];
  const node = value as Node;
  const keys = Object.keys(node);
  if (keys.length === 1 && keys[0] === "@id") return [node["@id"] as string];
  return Object.values(node).flatMap(references);
}

function byType(graph: Graph, type: string): Node {
  const node = graph["@graph"].find((item) => item["@type"] === type);
  if (!node) throw new Error(`no ${type} in graph`);
  return node;
}

// The site-wide nodes live on the home page; other pages point at them by @id.
const SITE = json(siteGraph({ locale: "uz", name: "Kitoblarim — oʻzbek kitoblari katalogi", description: "Katalog" }));
const SITE_IDS = SITE["@graph"].map((node) => node["@id"] as string);

function expectReferencesResolve(graph: Graph) {
  const ids = new Set([...SITE_IDS, ...graph["@graph"].map((node) => node["@id"] as string)]);
  for (const ref of references(graph)) expect(ids, `@id ${ref}`).toContain(ref);
}

function expectBreadcrumb(graph: Graph, pageUrl: string, trail: [string, string][]) {
  const crumbs = byType(graph, "BreadcrumbList");
  expect(crumbs["@id"]).toBe(`${pageUrl}#breadcrumb`);
  expect(crumbs.itemListElement).toEqual(
    trail.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: url })),
  );
}

const TRAIL = [
  { name: "Kitoblarim", path: "" },
  { name: "Kitoblar", path: "/books" },
  { name: "Oʻtgan kunlar", path: "/book/42" },
];

const fullBook: BookWithTranslator = {
  id: "42",
  uzbekTitle: "Oʻtgan kunlar",
  originalTitle: "Ўтган кунлар",
  author: "Abdulla Qodiriy",
  authors: [{ id: "1", slug: "abdulla-qodiriy", name: "Abdulla Qodiriy" }],
  publisher: "Sharq",
  sourceLanguage: "Oʻzbek (kirill)",
  coverUrl: `${INTERNAL}/storage/covers/42.jpg`,
  description: "Birinchi oʻzbek romani.",
  categories: [{ slug: "roman", name: "Roman" }],
  editions: [
    {
      id: "e1",
      title: null,
      isbn: null,
      publisher: null,
      translators: [{ slug: "ali", name: "Ali Valiyev", role: "translator" }],
      year: null,
      coverUrl: "",
    },
    {
      id: "e2",
      title: "Oʻtgan kunlar (2-nashr)",
      isbn: "9789943012345",
      publisher: { slug: "sharq", name: "Sharq" },
      translators: [
        { slug: "ali", name: "Ali Valiyev" },
        { slug: "muharrir", name: "Muharrir", role: "editor" },
      ],
      year: 2019,
      pages: 416,
      language: "uz",
      coverUrl: "",
    },
  ],
  taqrizlar: [
    {
      id: "7",
      body: "Ajoyib roman.",
      scores: { plot: 9 },
      averageScore: 8.5,
      createdAt: "2026-05-01",
      taqrizchi: { slug: "critic", name: "Tanqidchi" },
    },
    { id: "8", body: "Baholanmagan.", scores: {}, averageScore: null, createdAt: null, taqrizchi: null },
  ],
  readerRating: { average: 4.6, count: 12 },
  readerReviews: [
    { id: "r1", authorName: "Dilnoza", rating: 5, body: "Yoqdi.", writtenAt: "2026-09-01" },
    { id: "r2", authorName: null, rating: null, body: "Baho bermadim.", writtenAt: null },
  ],
};

const sparseBook: BookWithTranslator = {
  id: "43",
  uzbekTitle: "Nomaʼlum kitob",
  originalTitle: null,
  author: "",
  authors: [],
  publisher: "",
  coverUrl: `${INTERNAL}/storage/placeholder.svg`,
  description: null,
  sourceLanguage: null,
  editions: [],
  taqrizlar: [],
  readerRating: null,
  readerReviews: [],
};

describe("siteGraph", () => {
  it("names the site, its publisher and the books search box", () => {
    const website = byType(SITE, "WebSite");
    expect(website).toMatchObject({
      "@id": `${ORIGIN}/#website`,
      url: ORIGIN,
      inLanguage: ["uz-UZ", "ru-RU", "en"],
      publisher: { "@id": `${ORIGIN}/#organization` },
    });
    expect(website.potentialAction).toEqual({
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${ORIGIN}/uz/books?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    });
    expect(byType(SITE, "Organization")).toMatchObject({ "@id": `${ORIGIN}/#organization`, name: "Kitoblarim" });
  });

  it("has no empty values and every @id resolves", () => {
    expect(emptyValues(SITE)).toEqual([]);
    expectReferencesResolve(SITE);
  });
});

describe("bookPageGraph", () => {
  const url = `${ORIGIN}/ru/book/42`;
  const graph = json(bookPageGraph({ book: fullBook, locale: "ru", path: "/book/42", description: "Desc.", trail: TRAIL }));
  const book = byType(graph, "Book");

  it("has no null or empty values, even for a book with almost no data", () => {
    expect(emptyValues(graph)).toEqual([]);
    const sparse = json(bookPageGraph({ book: sparseBook, locale: "uz", path: "/book/43", description: "", trail: TRAIL }));
    expect(emptyValues(sparse)).toEqual([]);
    expect(byType(sparse, "Book")).toEqual({
      "@type": "Book",
      "@id": `${ORIGIN}/uz/book/43#book`,
      url: `${ORIGIN}/uz/book/43`,
      name: "Nomaʼlum kitob",
    });
  });

  it("cross-references the page, the book and the breadcrumb by @id", () => {
    expect(byType(graph, "ItemPage")).toMatchObject({
      "@id": url,
      url,
      inLanguage: "ru-RU",
      about: { "@id": `${url}#book` },
      mainEntity: { "@id": `${url}#book` },
      breadcrumb: { "@id": `${url}#breadcrumb` },
      isPartOf: { "@id": `${ORIGIN}/#website` },
    });
    expect(book["@id"]).toBe(`${url}#book`);
    expectReferencesResolve(graph);
  });

  it("lists the breadcrumb in order, as absolute URLs in the page's language", () => {
    expectBreadcrumb(graph, url, [
      ["Kitoblarim", `${ORIGIN}/ru`],
      ["Kitoblar", `${ORIGIN}/ru/books`],
      ["Oʻtgan kunlar", url],
    ]);
  });

  it("describes the book in its printings' language, whatever the page language", () => {
    expect(book.inLanguage).toBe("uz");
  });

  it("says a Russian printing is in Russian, and a bilingual one in both", () => {
    const russian = json(
      bookPageGraph({
        book: { ...fullBook, editions: [{ id: "r", translators: [], coverUrl: "", language: "Rus tili" }] },
        locale: "uz",
        path: "/book/44",
        description: "",
        trail: TRAIL,
      }),
    );
    const node = (russian["@graph"] as Node[]).find((n) => n["@type"] === "Book")!;
    expect(node.inLanguage).toBe("ru");
    expect((node.workExample as Node[])[0].inLanguage).toBe("ru");

    const both = json(
      bookPageGraph({
        book: { ...fullBook, editions: [{ id: "b", translators: [], coverUrl: "", language: "Oʻzbek tili, Rus tili" }] },
        locale: "uz",
        path: "/book/45",
        description: "",
        trail: TRAIL,
      }),
    );
    expect((both["@graph"] as Node[]).find((n) => n["@type"] === "Book")!.inLanguage).toEqual(["uz", "ru"]);
  });

  it("uses the public cover URL, never the internal Docker host", () => {
    expect(book.image).toBe(`${PUBLIC}/storage/covers/42.jpg`);
    expect(JSON.stringify(graph)).not.toContain(INTERNAL);
  });

  it("credits translators once each and leaves editors out", () => {
    expect(book.translator).toEqual([{ "@type": "Person", name: "Ali Valiyev", url: `${ORIGIN}/ru/translator/ali` }]);
    expect(book.translationOfWork).toEqual({
      "@type": "Book",
      name: "Ўтган кунлар",
      inLanguage: { "@type": "Language", name: "Oʻzbek (kirill)" },
    });
    expect(book.author).toEqual([{ "@type": "Person", name: "Abdulla Qodiriy", url: `${ORIGIN}/ru/author/abdulla-qodiriy` }]);
  });

  it("lists every edition, with the first ISBN on the book", () => {
    expect(book.isbn).toBe("9789943012345");
    expect(book.workExample).toEqual([
      { "@type": "Book", name: "Oʻtgan kunlar" },
      {
        "@type": "Book",
        name: "Oʻtgan kunlar (2-nashr)",
        isbn: "9789943012345",
        bookEdition: "2019",
        datePublished: "2019",
        numberOfPages: 416,
        publisher: { "@type": "Organization", name: "Sharq" },
        inLanguage: "uz",
      },
    ]);
  });

  it("rates taqrizlar out of 10 and readers out of 5", () => {
    const reviews = book.review as Node[];
    expect(reviews).toHaveLength(4);
    expect(reviews[0]).toEqual({
      "@type": "Review",
      url: `${ORIGIN}/ru/taqriz/7`,
      author: { "@type": "Person", name: "Tanqidchi" },
      datePublished: "2026-05-01",
      reviewBody: "Ajoyib roman.",
      reviewRating: { "@type": "Rating", ratingValue: 8.5, bestRating: 10, worstRating: 0 },
    });
    expect(reviews[1]).not.toHaveProperty("reviewRating");
    expect(reviews[1]).not.toHaveProperty("author");
    expect(reviews[2]).toEqual({
      "@type": "Review",
      author: { "@type": "Person", name: "Dilnoza" },
      datePublished: "2026-09-01",
      reviewBody: "Yoqdi.",
      reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5, worstRating: 1 },
    });
    expect(reviews[3]).toEqual({
      "@type": "Review",
      author: { "@type": "Person", name: "Kitoblarim" },
      reviewBody: "Baho bermadim.",
    });
  });

  it("gives an aggregate rating from readers, out of 5", () => {
    expect(book.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.6,
      ratingCount: 12,
      bestRating: 5,
      worstRating: 1,
    });
  });

  it.each([null, undefined, { average: 0, count: 0 }])("claims no aggregate rating for %j", (readerRating) => {
    const graph = json(
      bookPageGraph({ book: { ...fullBook, readerRating }, locale: "uz", path: "/book/42", description: "D", trail: TRAIL }),
    );
    expect(byType(graph, "Book")).not.toHaveProperty("aggregateRating");
  });
});

describe("authorPageGraph", () => {
  const author: Author = {
    slug: "abdulla-qodiriy",
    name: "Abdulla Qodiriy",
    originalName: "Абдулла Қодирий",
    bio: null,
    nationality: "Oʻzbek",
    birthYear: 1894,
    deathYear: 1938,
    portraitUrl: `${INTERNAL}/storage/authors/aq.jpg`,
    websiteUrl: "javascript:alert(1)",
    bookCount: 3,
  };
  const url = `${ORIGIN}/en/author/abdulla-qodiriy`;
  const graph = json(
    authorPageGraph({
      author,
      locale: "en",
      path: "/author/abdulla-qodiriy",
      trail: [
        { name: "Kitoblarim", path: "" },
        { name: "Authors", path: "/authors" },
        { name: "Abdulla Qodiriy", path: "/author/abdulla-qodiriy" },
      ],
    }),
  );

  it("describes the person with only the facts it has, and only safe links", () => {
    expect(byType(graph, "Person")).toEqual({
      "@type": "Person",
      "@id": `${url}#person`,
      url,
      name: "Abdulla Qodiriy",
      alternateName: "Абдулла Қодирий",
      nationality: "Oʻzbek",
      birthDate: "1894",
      deathDate: "1938",
      image: `${PUBLIC}/storage/authors/aq.jpg`,
    });
    expect(emptyValues(graph)).toEqual([]);
  });

  it("drops an alternate name that repeats the name, and an SVG portrait", () => {
    const person = byType(
      json(
        authorPageGraph({
          author: { ...author, originalName: author.name, portraitUrl: `${INTERNAL}/storage/x.svg`, websiteUrl: "https://example.uz" },
          locale: "en",
          path: "/author/abdulla-qodiriy",
          trail: [],
        }),
      ),
      "Person",
    );
    expect(person).not.toHaveProperty("alternateName");
    expect(person).not.toHaveProperty("image");
    expect(person.sameAs).toBe("https://example.uz/");
  });

  it("cross-references by @id and lists the breadcrumb in order", () => {
    expect(byType(graph, "ProfilePage")).toMatchObject({ "@id": url, mainEntity: { "@id": `${url}#person` } });
    expectReferencesResolve(graph);
    expectBreadcrumb(graph, url, [
      ["Kitoblarim", `${ORIGIN}/en`],
      ["Authors", `${ORIGIN}/en/authors`],
      ["Abdulla Qodiriy", url],
    ]);
  });
});

describe("publisherPageGraph", () => {
  const publisher: Publisher = {
    slug: "sharq",
    name: "Sharq",
    bio: "",
    establishedYear: null,
    logoUrl: `${INTERNAL}/storage/logos/sharq.png`,
    websiteUrl: "https://sharq.uz",
    bookCount: 120,
  };
  const url = `${ORIGIN}/uz/publisher/sharq`;
  const graph = json(
    publisherPageGraph({
      publisher,
      locale: "uz",
      path: "/publisher/sharq",
      trail: [
        { name: "Kitoblarim", path: "" },
        { name: "Nashriyotlar", path: "/publishers" },
        { name: "Sharq", path: "/publisher/sharq" },
      ],
    }),
  );

  it("describes the organization with only the facts it has", () => {
    expect(byType(graph, "Organization")).toEqual({
      "@type": "Organization",
      "@id": `${url}#publisher`,
      url,
      name: "Sharq",
      logo: `${PUBLIC}/storage/logos/sharq.png`,
      sameAs: "https://sharq.uz/",
    });
    expect(emptyValues(graph)).toEqual([]);
  });

  it("cross-references by @id and lists the breadcrumb in order", () => {
    expect(byType(graph, "ProfilePage")).toMatchObject({ "@id": url, about: { "@id": `${url}#publisher` } });
    expectReferencesResolve(graph);
    expectBreadcrumb(graph, url, [
      ["Kitoblarim", `${ORIGIN}/uz`],
      ["Nashriyotlar", `${ORIGIN}/uz/publishers`],
      ["Sharq", url],
    ]);
  });
});

describe("languageCodes", () => {
  it.each([
    ["Rus tili", ["ru"]],
    ["O'zbek tili", ["uz"]],
    ["Oʻzbekcha", ["uz"]],
    ["Ingliz tili", ["en"]],
    ["Oʻzbek tili, Yapon tili", ["uz", "ja"]],
    ["Rus tili, Rus tili", ["ru"]],
    ["uz", ["uz"]],
  ])("reads %j as %j", (field, codes) => {
    expect(languageCodes(field)).toEqual(codes);
  });

  it("leaves out what it doesn't know rather than guess", () => {
    expect(languageCodes("Klingon tili")).toEqual([]);
    expect(languageCodes(null)).toEqual([]);
  });
});

