import { describe, expect, it } from "vitest";
import { absoluteUrl, localeAlternates } from "@/lib/site";

const ORIGIN = "https://tarjima.kitoblarim.uz";

describe("absoluteUrl", () => {
  it("prefixes the locale and keeps the path", () => {
    expect(absoluteUrl("uz", "/book/42")).toBe(`${ORIGIN}/uz/book/42`);
    expect(absoluteUrl("ru", "/translator/ali")).toBe(`${ORIGIN}/ru/translator/ali`);
  });

  it("adds the missing slash to a bare path", () => {
    expect(absoluteUrl("en", "books")).toBe(`${ORIGIN}/en/books`);
  });

  it("points a locale's home at /<locale>, with no trailing slash", () => {
    expect(absoluteUrl("uz")).toBe(`${ORIGIN}/uz`);
    expect(absoluteUrl("en", "")).toBe(`${ORIGIN}/en`);
  });
});

describe("localeAlternates", () => {
  it("gives each page its own canonical, not the home page", () => {
    expect(localeAlternates("ru", "/book/42").canonical).toBe(`${ORIGIN}/ru/book/42`);
  });

  it("lists every language by its hreflang tag, plus x-default in Uzbek", () => {
    expect(localeAlternates("en", "/book/42").languages).toEqual({
      "uz-UZ": `${ORIGIN}/uz/book/42`,
      "ru-RU": `${ORIGIN}/ru/book/42`,
      en: `${ORIGIN}/en/book/42`,
      "x-default": `${ORIGIN}/uz/book/42`,
    });
  });

  it("is the same set of alternates whichever language the page is in", () => {
    const uz = localeAlternates("uz", "/authors").languages;
    expect(localeAlternates("ru", "/authors").languages).toEqual(uz);
    expect(localeAlternates("en", "/authors").languages).toEqual(uz);
  });
});
