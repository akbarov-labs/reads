import { describe, expect, it } from "vitest";
import { bookPublishers } from "@/lib/bookPublishers";
import type { BookWithTranslator } from "@/lib/types";

const gafur = { slug: "gafur-gulom", name: "G'afur G'ulom" };
const oltin = { slug: "oltin-qalam", name: "Oltin qalam" };

const book: BookWithTranslator = {
  id: "5156",
  uzbekTitle: "Taras Bulba",
  author: "N.V.Gogol",
  publisher: "G'afur G'ulom",
  publisherSlug: "gafur-gulom",
  year: 2025,
  coverUrl: "",
};

describe("bookPublishers", () => {
  it("names every publisher that printed the book, in the order of the printings", () => {
    expect(
      bookPublishers({
        ...book,
        editions: [
          { id: "a", translators: [], coverUrl: "", year: 2025, publisher: gafur },
          { id: "b", translators: [], coverUrl: "", year: 2023, publisher: oltin },
        ],
      }),
    ).toEqual([
      { slug: "gafur-gulom", name: "G'afur G'ulom", year: 2025 },
      { slug: "oltin-qalam", name: "Oltin qalam", year: 2023 },
    ]);
  });

  it("names a publisher once, with its newest year", () => {
    expect(
      bookPublishers({
        ...book,
        editions: [
          { id: "a", translators: [], coverUrl: "", year: null, publisher: oltin },
          { id: "b", translators: [], coverUrl: "", year: 2019, publisher: oltin },
          { id: "c", translators: [], coverUrl: "", year: 2023, publisher: oltin },
          { id: "d", translators: [], coverUrl: "", year: 2020 },
        ],
      }),
    ).toEqual([{ slug: "oltin-qalam", name: "Oltin qalam", year: 2023 }]);
  });

  it("falls back to the card's publisher when no edition names one", () => {
    expect(bookPublishers(book)).toEqual([{ slug: "gafur-gulom", name: "G'afur G'ulom", year: 2025 }]);
    expect(bookPublishers({ ...book, publisher: "" })).toEqual([]);
  });
});
