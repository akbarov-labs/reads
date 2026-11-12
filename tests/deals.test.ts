import { describe, expect, it } from "vitest";
import { daysLeft, dealHref, stillOn } from "@/lib/deals";
import type { Deal } from "@/lib/types";

const deal = (overrides: Partial<Deal> = {}): Deal => ({
  id: "7",
  kind: "discount",
  title: "Barcha kitoblarga 30% chegirma",
  details: null,
  discountPercent: 30,
  promoCode: null,
  startsOn: null,
  endsOn: null,
  url: "https://qamar.uz/aksiya",
  sourceUrl: null,
  imageUrl: null,
  postedAt: null,
  source: { name: "Qamar", publisherSlug: null },
  book: null,
  ...overrides,
});

// 12 November, 23:30 in Tashkent (18:30 UTC).
const NOW = new Date("2026-11-12T18:30:00Z");

describe("stillOn", () => {
  it("keeps today's and undated deals, drops ended and not yet started ones", () => {
    const kept = stillOn(
      [
        deal({ id: "today", endsOn: "2026-11-12" }),
        deal({ id: "undated" }),
        deal({ id: "ended", endsOn: "2026-11-11" }),
        deal({ id: "later", startsOn: "2026-11-13" }),
      ],
      NOW,
    );

    expect(kept.map((d) => d.id)).toEqual(["today", "undated"]);
  });
});

describe("daysLeft", () => {
  it("counts Tashkent days to the last one", () => {
    expect(daysLeft(deal({ endsOn: "2026-11-12" }), NOW)).toBe(0);
    expect(daysLeft(deal({ endsOn: "2026-11-15" }), NOW)).toBe(3);
    expect(daysLeft(deal(), NOW)).toBeNull();
  });
});

describe("dealHref", () => {
  it("goes through the counting redirect, and nowhere without a link", () => {
    expect(dealHref(deal(), "ru")).toBe("/go/deal/7?l=ru");
    expect(dealHref(deal({ url: null }), "uz")).toBeNull();
  });
});
