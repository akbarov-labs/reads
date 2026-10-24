import { describe, expect, it } from "vitest";
import { storeLinks, storeQuery, storeRedirectPath, storeSearchUrl } from "@/lib/stores";

describe("storeQuery", () => {
  it("drops bracketed parts, which store searches don't match", () => {
    expect(storeQuery("Tazarru (Tergovchi)")).toBe("Tazarru");
    expect(storeQuery("Qutul qulub [1-4 toʻplam] 2-nashr")).toBe("Qutul qulub 2-nashr");
  });

  it("keeps a title that is only brackets rather than search for nothing", () => {
    expect(storeQuery("(Nomsiz)")).toBe("(Nomsiz)");
  });
});

describe("storeLinks", () => {
  it("searches every store for the title, encoded, in the page's order", () => {
    expect(storeLinks("Oʻtgan kunlar (roman)")).toEqual([
      { key: "asaxiy", name: "Asaxiy", url: "https://asaxiy.uz/product?key=O%CA%BBtgan%20kunlar" },
      { key: "book.uz", name: "Book.uz", url: "https://book.uz/catalog?search=O%CA%BBtgan%20kunlar" },
      { key: "hilol-nashr", name: "Hilol-nashr", url: "https://hilolnashr.uz/index.php?route=product/search&search=O%CA%BBtgan%20kunlar" },
      { key: "qamar", name: "Qamar", url: "https://qamar.uz/?q=O%CA%BBtgan%20kunlar" },
    ]);
  });

  it("can't be used to inject another parameter", () => {
    for (const store of storeLinks("A&b=c#d")) expect(store.url).toContain("A%26b%3Dc%23d");
  });
});

describe("storeSearchUrl", () => {
  it("is the same search the page used to link to", () => {
    expect(storeSearchUrl("book.uz", "Tazarru (Tergovchi)")).toBe("https://book.uz/catalog?search=Tazarru");
  });

  it("knows only the listed stores", () => {
    expect(storeSearchUrl("evil.example", "Tazarru")).toBeNull();
    expect(storeSearchUrl("", "Tazarru")).toBeNull();
  });
});

describe("storeRedirectPath", () => {
  it("goes through this site's counting redirect", () => {
    expect(storeRedirectPath("book.uz", "42", "ru")).toBe("/go/store/book.uz/42?l=ru");
  });
});
