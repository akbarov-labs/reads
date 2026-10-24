import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import { askAiUrl, authorQuestion, bookQuestion, publisherQuestion, translatorQuestion } from "@/lib/askAi";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import uz from "@/messages/uz.json";

type Translate = Parameters<typeof bookQuestion>[1];
const t = (locale: string, messages: typeof en) =>
  createTranslator({ locale, messages, namespace: "askAi" }) as unknown as Translate;

describe("askAiUrl", () => {
  it("opens Google's AI Mode with the question asked and Google itself in the reader's language", () => {
    const url = new URL(askAiUrl("Xadicha Kubro Tongar kim?", "ru"));
    expect(url.origin + url.pathname).toBe("https://www.google.com/search");
    expect(url.searchParams.get("udm")).toBe("50");
    expect(url.searchParams.get("hl")).toBe("ru");
    expect(url.searchParams.get("q")).toBe("Xadicha Kubro Tongar kim?");
  });
});

describe("questions", () => {
  const book = { uzbekTitle: "Baqirmaydigan onalar", originalTitle: "Bağırmayan Anneler", author: "Xadicha Kubro Tongar" };

  it("ask about a book in the page's language, by both its titles and its author", () => {
    expect(bookQuestion(book, t("uz", uz as typeof en))).toMatch(
      /^Xadicha Kubro Tongarning «Baqirmaydigan onalar \(Bağırmayan Anneler\)» kitobi haqida/,
    );
    expect(bookQuestion(book, t("ru", ru as typeof en))).toMatch(/^Расскажи подробно о книге «Baqirmaydigan onalar \(Bağırmayan Anneler\)» \(Xadicha Kubro Tongar\)/);
    expect(bookQuestion(book, t("en", en))).toMatch(/^Tell me in detail about the book “Baqirmaydigan onalar \(Bağırmayan Anneler\)” by Xadicha Kubro Tongar:/);
  });

  it("make do without an author or an original title", () => {
    expect(bookQuestion({ uzbekTitle: "1984", originalTitle: "1984", author: "" }, t("en", en))).toMatch(
      /^Tell me in detail about the book “1984”: /,
    );
  });

  it("name an author by the spelling the world knows too", () => {
    expect(authorQuestion({ name: "Xadicha Kubro Tongar", originalName: "Hatice Kübra Tongar" }, t("en", en))).toMatch(
      /^Tell me in detail about the writer Xadicha Kubro Tongar \(Hatice Kübra Tongar\):/,
    );
    expect(authorQuestion({ name: "Abdulla Qodiriy", originalName: null }, t("uz", uz as typeof en))).toMatch(/^Yozuvchi Abdulla Qodiriy haqida/);
  });

  it("ask about translators and publishers as such", () => {
    expect(translatorQuestion({ name: "Ali Valiyev" }, t("uz", uz as typeof en))).toMatch(/^Tarjimon Ali Valiyev haqida/);
    expect(publisherQuestion({ name: "Asaxiy Books" }, t("ru", ru as typeof en))).toMatch(/^Расскажи подробно об издательстве «Asaxiy Books»/);
  });

  it("stay well inside what a link can carry", () => {
    const long = { uzbekTitle: "x".repeat(200), originalTitle: "y".repeat(200), author: "z".repeat(100) };
    for (const [locale, messages] of [["uz", uz], ["ru", ru], ["en", en]] as const) {
      expect(askAiUrl(bookQuestion(long, t(locale, messages as typeof en)), locale).length).toBeLessThan(2000);
    }
  });
});
