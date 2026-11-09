import { describe, expect, it } from "vitest";
import { SITE_SECTIONS, isInSection } from "@/lib/siteSections";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import uz from "@/messages/uz.json";

const books = SITE_SECTIONS.find((s) => s.href === "/books")!;
const authors = SITE_SECTIONS.find((s) => s.href === "/authors")!;

describe("isInSection", () => {
  it("matches a section's list and its entries", () => {
    expect(isInSection("/books", books)).toBe(true);
    expect(isInSection("/book/43", books)).toBe(true);
    expect(isInSection("/author/abdulla-qodiriy", authors)).toBe(true);
  });

  it("doesn't match another section, the home page or a longer word", () => {
    expect(isInSection("/authors", books)).toBe(false);
    expect(isInSection("/", books)).toBe(false);
    expect(isInSection("/bookshelf", books)).toBe(false);
    expect(isInSection("/booksellers", books)).toBe(false);
    expect(isInSection("/taqrizchilar", authors)).toBe(false);
  });
});

describe("SITE_SECTIONS", () => {
  it.each([["uz", uz], ["ru", ru], ["en", en]])("has a name for every section in %s", (_locale, messages) => {
    for (const section of SITE_SECTIONS) {
      expect(messages.home[section.labelKey]).toBeTruthy();
    }
  });
});
