import { describe, expect, it } from "vitest";
import { bookDescription, bookTitle } from "@/lib/seo";
import type { BookWithTranslator } from "@/lib/types";
import en from "@/messages/en.json";

const t = (key: string) => (en.bookDetail as Record<string, string>)[key];

const book: BookWithTranslator = {
  id: "1",
  uzbekTitle: "Chol va dengiz",
  originalTitle: "The Old Man and the Sea",
  author: "Ernest Hemingway",
  publisher: "Sharq",
  year: 2001,
  coverUrl: "",
  translatorName: "Ibrohim Gʻafurov",
  editions: [
    { id: "a", translators: [], coverUrl: "", year: null },
    { id: "b", translators: [], coverUrl: "", year: 2015 },
  ],
};

describe("bookDescription", () => {
  it("says title, original, author, translator and publisher with the edition year", () => {
    expect(bookDescription(book, t)).toBe(
      "Chol va dengiz (The Old Man and the Sea) — Ernest Hemingway. Translator: Ibrohim Gʻafurov. Publisher: Sharq, 2015.",
    );
  });

  it("falls back to the book's own year when no edition has one", () => {
    expect(bookDescription({ ...book, editions: [] }, t)).toContain("Publisher: Sharq, 2001.");
  });

  it("does not repeat an original title that is the same as the title", () => {
    expect(bookDescription({ ...book, originalTitle: "Chol va dengiz" }, t)).toMatch(/^Chol va dengiz — /);
  });

  it("drops every clause it has no data for, and never says null", () => {
    const bare: BookWithTranslator = {
      id: "2",
      uzbekTitle: "Nomaʼlum",
      originalTitle: null,
      author: null as unknown as string,
      publisher: null as unknown as string,
      year: null,
      coverUrl: "",
      translatorName: null,
      editions: undefined,
    };
    expect(bookDescription(bare, t)).toBe("Nomaʼlum.");
  });

  it("drops the year, not the publisher, when the year is unknown", () => {
    expect(bookDescription({ ...book, year: null, editions: [] }, t)).toMatch(/Publisher: Sharq\.$/);
  });

  it.each([
    { translatorName: null },
    { publisher: "" },
    { originalTitle: null, author: "" },
  ])("has no empty or null text with %j", (overrides) => {
    const text = bookDescription({ ...book, ...overrides }, t);
    expect(text).not.toMatch(/null|undefined|\(\)|: \.|— \.|\s{2}/);
  });
});

describe("bookTitle", () => {
  it("names the author after the title", () => {
    expect(bookTitle(book)).toBe("Chol va dengiz — Ernest Hemingway");
  });

  it("is the title alone when there is no author, with no dangling dash", () => {
    expect(bookTitle({ ...book, author: "" })).toBe("Chol va dengiz");
    expect(bookTitle({ ...book, author: "  " })).toBe("Chol va dengiz");
  });
});
