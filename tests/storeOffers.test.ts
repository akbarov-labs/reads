import { describe, expect, it } from "vitest";
import { arrangeOffers } from "@/lib/storeOffers";
import type { StoreOffer } from "@/lib/types";

const offer = (store: string, price: number | null, inStock: boolean | null): StoreOffer => ({
  store,
  name: store,
  url: `https://${store}.uz/x`,
  price,
  inStock,
  left: null,
  checkedAt: "2026-11-11T00:00:00Z",
});

describe("arrangeOffers", () => {
  it("folds sold-out stores away when another has the book, and marks the one cheapest", () => {
    const { shown, more, cheapest } = arrangeOffers([offer("asaxiy", 62000, true), offer("qamar", 65000, true), offer("hilol-nashr", 50000, false)]);

    expect(shown.map((o) => o.store)).toEqual(["asaxiy", "qamar"]);
    expect(more.map((o) => o.store)).toEqual(["hilol-nashr"]);
    expect(cheapest).toBe("asaxiy");
  });

  it("shows sold-out stores when none has it, and calls nothing cheapest", () => {
    const { shown, more, cheapest } = arrangeOffers([offer("qamar", 65000, false), offer("asaxiy", 60000, false)]);

    expect(shown.map((o) => o.store)).toEqual(["qamar", "asaxiy"]);
    expect(more).toEqual([]);
    expect(cheapest).toBeNull();
  });

  it("keeps three in view, and no 'cheapest' for a lone store or a tie", () => {
    const four = arrangeOffers([offer("a", 1, true), offer("b", 2, true), offer("c", 3, true), offer("d", 4, true)]);
    expect(four.shown).toHaveLength(3);
    expect(four.more.map((o) => o.store)).toEqual(["d"]);

    expect(arrangeOffers([offer("qamar", 65000, true)]).cheapest).toBeNull();
    expect(arrangeOffers([offer("a", 50000, true), offer("b", 50000, true)]).cheapest).toBeNull();
    expect(arrangeOffers([offer("a", null, true), offer("b", 50000, true)]).cheapest).toBeNull();
    expect(arrangeOffers(undefined)).toEqual({ shown: [], more: [], cheapest: null });
  });
});
