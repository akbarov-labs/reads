import { describe, expect, it } from "vitest";
import { foldForSearch, matchesSearch } from "@/lib/searchFold";

describe("foldForSearch", () => {
  it("spells Cyrillic in Uzbek Latin and drops apostrophes", () => {
    expect(foldForSearch("Ғафур Ғулом")).toBe("gafur gulom");
    expect(foldForSearch("Gʻafur Gʻulom")).toBe("gafur gulom");
    expect(foldForSearch("O'tkir  Hoshimov")).toBe("otkir hoshimov");
  });
});

describe("matchesSearch", () => {
  it("finds a name by the start of any of its words, in either alphabet", () => {
    expect(matchesSearch("Ibrohim Gʻafurov", "ғафур")).toBe(true);
    expect(matchesSearch("Ibrohim Gʻafurov", "gafurov ibro")).toBe(true);
    expect(matchesSearch("Ibrohim Gʻafurov", "rohim")).toBe(false);
  });

  it("lets an empty query match everything", () => {
    expect(matchesSearch("Anyone", "  ")).toBe(true);
  });
});
