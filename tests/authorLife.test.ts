import { describe, expect, it } from "vitest";
import { authorLifeLine } from "@/lib/authorLife";

describe("authorLifeLine", () => {
  it("joins the years and the country it knows", () => {
    expect(authorLifeLine({ birthYear: 1821, deathYear: 1881, nationality: "Rossiya" })).toBe("1821–1881 · Rossiya");
    expect(authorLifeLine({ birthYear: 1947, deathYear: null, nationality: "AQSh" })).toBe("1947 · AQSh");
    expect(authorLifeLine({ birthYear: null, deathYear: 1111, nationality: null })).toBe("?–1111");
    expect(authorLifeLine({ nationality: " Oʻzbekiston " })).toBe("Oʻzbekiston");
  });

  it("is nothing when nothing is known", () => {
    expect(authorLifeLine({})).toBeNull();
    expect(authorLifeLine({ birthYear: null, deathYear: null, nationality: "  " })).toBeNull();
  });
});
