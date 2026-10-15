import { describe, expect, it } from "vitest";
import { storeLinks, storeQuery } from "@/lib/stores";

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
      { name: "Asaxiy", url: "https://asaxiy.uz/product?key=O%CA%BBtgan%20kunlar" },
      { name: "Book.uz", url: "https://book.uz/catalog?search=O%CA%BBtgan%20kunlar" },
      { name: "Hilol-nashr", url: "https://hilolnashr.uz/index.php?route=product/search&search=O%CA%BBtgan%20kunlar" },
      { name: "Qamar", url: "https://qamar.uz/?q=O%CA%BBtgan%20kunlar" },
    ]);
  });

  it("can't be used to inject another parameter", () => {
    for (const store of storeLinks("A&b=c#d")) expect(store.url).toContain("A%26b%3Dc%23d");
  });
});
