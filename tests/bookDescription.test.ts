import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import { bookDescription, bookPages, bookSeoTitle, bookTitle, readingDays } from "@/lib/seo";
import type { BookWithTranslator } from "@/lib/types";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import uz from "@/messages/uz.json";

type Translate = Parameters<typeof bookDescription>[1];

/** The page's own translator for bookDetail, ICU plurals and all. */
function translator(locale: string, messages: typeof en): Translate {
  return createTranslator({ locale, messages, namespace: "bookDetail" }) as unknown as Translate;
}

const t = translator("en", en);

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

describe("bookSeoTitle", () => {
  it("says what the page has after the name", () => {
    expect(
      bookSeoTitle(
        { ...book, readerRating: { average: 4.62, count: 162 }, taqrizlar: [{} as never] } as BookWithTranslator,
        t,
      ),
    ).toBe("Chol va dengiz — Ernest Hemingway: translation, 2 editions, 4.6/5, reviews");
  });

  it("only claims what is there", () => {
    const original = { ...book, translatorName: null, editions: [book.editions![0]] };
    expect(bookSeoTitle(original, t)).toBe("Chol va dengiz — Ernest Hemingway: where to find it");
    expect(bookSeoTitle({ ...original, readerRating: { average: 0, count: 0 } } as BookWithTranslator, t)).not.toContain("/5");
  });

  it("reads naturally in Uzbek and Russian", () => {
    expect(bookSeoTitle(book, translator("uz", uz as typeof en))).toBe("Chol va dengiz — Ernest Hemingway: tarjima, 2 ta nashr");
    expect(bookSeoTitle({ ...book, editions: [...book.editions!, ...book.editions!, ...book.editions!] }, translator("ru", ru as typeof en))).toBe(
      "Chol va dengiz — Ernest Hemingway: перевод, 6 изданий",
    );
  });
});

describe("reading time and readers' rating", () => {
  const read: BookWithTranslator = {
    ...book,
    editions: [
      { id: "a", translators: [], coverUrl: "", year: null, pages: null },
      { id: "b", translators: [], coverUrl: "", year: 2015, pages: 304 },
    ],
    readerRating: { average: 4.666, count: 12 },
  };

  it("says how long the book takes and what readers gave it, before the credits", () => {
    expect(bookDescription(read, t)).toBe(
      "Chol va dengiz (The Old Man and the Sea) — Ernest Hemingway. 304 pages. At 20 minutes a day, you'll finish it in about 16 days. Kitoblarim readers rate it 4.7/5 (12 ratings). Translator: Ibrohim Gʻafurov. Publisher: Sharq, 2015.",
    );
  });

  it("reads naturally in Uzbek", () => {
    const text = bookDescription(read, translator("uz", uz as typeof en));
    expect(text).toContain("304 bet. Kuniga 20 daqiqa oʻqisangiz, taxminan 16 kunda tugatasiz.");
    expect(text).toContain("Kitoblarim oʻquvchilari bahosi: 4.7/5 (12 ta baho).");
  });

  it.each([
    [420, "21 день"],
    [440, "22 дня"],
    [500, "25 дней"],
  ])("puts %i pages' days in the right Russian form", (pages, days) => {
    const text = bookDescription({ ...read, editions: [{ id: "a", translators: [], coverUrl: "", pages }] }, translator("ru", ru as typeof en));
    expect(text).toContain(`примерно за ${days}.`);
  });

  it("leaves out the rating when nobody has rated the book", () => {
    expect(bookDescription({ ...read, readerRating: { average: 0, count: 0 } }, t)).not.toContain("rate it");
    expect(bookDescription({ ...read, readerRating: null }, t)).not.toContain("rate it");
  });

  it("leaves out the reading time when no printing has a page count", () => {
    expect(bookDescription({ ...read, editions: [{ id: "a", translators: [], coverUrl: "", pages: 0 }] }, t)).not.toMatch(/pages|minutes/);
  });
});

describe("bookPages", () => {
  it("takes the first printing with a page count", () => {
    expect(bookPages({ ...book, editions: [{ id: "a", translators: [], coverUrl: "", pages: null }, { id: "b", translators: [], coverUrl: "", pages: 210 }] })).toBe(210);
  });

  it("is null without one", () => {
    expect(bookPages({ ...book, editions: undefined })).toBeNull();
  });
});

describe("readingDays", () => {
  it("is a page a minute, 20 minutes a day, rounded up, never zero", () => {
    expect(readingDays(1)).toBe(1);
    expect(readingDays(20)).toBe(1);
    expect(readingDays(21)).toBe(2);
    expect(readingDays(304)).toBe(16);
  });
});
