import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "next-intl";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import {
  EMPTY_RESULTS,
  allResultsPath,
  moveActive,
  normalizeQuery,
  searchOptions,
  type SearchResults,
} from "@/lib/search";
import en from "@/messages/en.json";
import uz from "@/messages/uz.json";

const results: SearchResults = {
  books: {
    items: [
      { id: "12", uzbekTitle: "Oʻtkan kunlar", originalTitle: null, author: "Abdulla Qodiriy", year: 2019, coverUrl: null },
    ],
    total: 3,
  },
  authors: { items: [{ slug: "abdulla-qodiriy", name: "Abdulla Qodiriy", imageUrl: null, bookCount: 7 }], total: 1 },
  translators: { items: [], total: 0 },
  publishers: { items: [{ slug: "sharq", name: "Sharq", imageUrl: null, bookCount: 1 }], total: 1 },
};

describe("normalizeQuery", () => {
  it("makes one cache entry of what differs only in case and spacing", () => {
    expect(normalizeQuery("  Oʻtkan   KUNLAR ")).toBe("oʻtkan kunlar");
  });

  it("is empty until there are two letters or digits to search for", () => {
    expect(normalizeQuery("")).toBe("");
    expect(normalizeQuery("a")).toBe("");
    expect(normalizeQuery("o'")).toBe("");
    expect(normalizeQuery(" - - ")).toBe("");
    expect(normalizeQuery("ot")).toBe("ot");
    expect(normalizeQuery("Ўт")).toBe("ўт");
  });

  it("caps a pasted essay", () => {
    expect(normalizeQuery("kitob ".repeat(50)).length).toBeLessThanOrEqual(100);
  });
});

describe("searchOptions", () => {
  it("walks the groups in order, then the full listing", () => {
    expect(searchOptions(results, "otkan")).toEqual([
      { id: "books-12", kind: "books", path: "/book/12" },
      { id: "authors-abdulla-qodiriy", kind: "authors", path: "/author/abdulla-qodiriy" },
      { id: "publishers-sharq", kind: "publishers", path: "/publisher/sharq" },
      { id: "all", kind: "all", path: "/books?q=otkan" },
    ]);
  });

  it("offers nothing when nothing matched", () => {
    expect(searchOptions(EMPTY_RESULTS, "zzz")).toEqual([]);
  });

  it("keeps the query as typed for the listing, apostrophes and all", () => {
    expect(allResultsPath(" Oʻtkan kun ")).toBe(`/books?q=${encodeURIComponent("Oʻtkan kun").replace(/%20/g, "+")}`);
  });
});

describe("moveActive", () => {
  it("wraps at either end and starts from nothing", () => {
    expect(moveActive(-1, 3, "ArrowDown")).toBe(0);
    expect(moveActive(2, 3, "ArrowDown")).toBe(0);
    expect(moveActive(-1, 3, "ArrowUp")).toBe(2);
    expect(moveActive(0, 3, "ArrowUp")).toBe(2);
    expect(moveActive(0, 0, "ArrowDown")).toBe(-1);
  });
});

type Translate = (key: string, values?: Record<string, string | number>) => string;
const tr = (locale: string, messages: typeof en) =>
  createTranslator({ locale, messages, namespace: "search" }) as unknown as Translate;

/** The visible text, tags dropped and spaces collapsed. */
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

describe("SearchSuggestions", () => {
  const render = (props: Partial<Parameters<typeof SearchSuggestions>[0]> = {}) =>
    renderToStaticMarkup(
      createElement(SearchSuggestions, {
        id: "s",
        results,
        options: searchOptions(results, "otkan"),
        query: "otkan",
        activeId: null,
        href: (path: string) => `/uz${path}`,
        t: tr("uz", uz as typeof en),
        ...props,
      }),
    );

  it("groups the matches under their kind, with how many there are, and skips empty kinds", () => {
    expect(text(render())).toBe(
      "Kitoblar 3 Oʻtkan kunlar Abdulla Qodiriy · 2019 Mualliflar 1 A Abdulla Qodiriy 7 ta kitob Nashriyotlar 1 S Sharq 1 ta kitob «otkan» boʻyicha barcha kitoblar →",
    );
  });

  it("links every option to its page in the reader's language", () => {
    const html = render();
    expect(html).toContain('href="/uz/book/12"');
    expect(html).toContain('href="/uz/author/abdulla-qodiriy"');
    expect(html).toContain('href="/uz/publisher/sharq"');
    expect(html).toContain('href="/uz/books?q=otkan"');
  });

  it("marks the option the arrow keys are on, for the combobox to point at", () => {
    const html = render({ activeId: "authors-abdulla-qodiriy" });
    expect(html).toMatch(/id="s-authors-abdulla-qodiriy" role="option" aria-selected="true"/);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
  });

  it("says so when nothing matched", () => {
    const html = render({ results: EMPTY_RESULTS, options: [], query: "zzz", t: tr("en", en) });
    expect(text(html)).toBe("Nothing found for “zzz”");
  });
});
