import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "next-intl";
import { ReaderCounts } from "@/components/ReaderCounts";
import { ReaderReviews } from "@/components/ReaderReviews";
import en from "@/messages/en.json";
import uz from "@/messages/uz.json";

type Translate = (key: string, values?: Record<string, number>) => string;
const tr = (locale: string, messages: typeof en) =>
  createTranslator({ locale, messages, namespace: "bookDetail" }) as unknown as Translate;

/** The visible text, tags dropped and spaces collapsed. */
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

describe("ReaderCounts", () => {
  it("says how many read, want and are reading it, in the bot", () => {
    const html = renderToStaticMarkup(
      createElement(ReaderCounts, { counts: { want: 474, reading: 43, read: 20 }, t: tr("uz", uz as typeof en) }),
    );
    expect(text(html)).toBe("Kitoblarim botida: 43 kishi oʻqiyapti · 474 kishi oʻqimoqchi · 20 kishi oʻqib boʻlgan");
  });

  it("leaves out what is zero, and says nothing when all are", () => {
    const t = tr("en", en);
    expect(text(renderToStaticMarkup(createElement(ReaderCounts, { counts: { want: 3, reading: 0, read: 0 }, t })))).toBe(
      "In the Kitoblarim bot: 3 want to read",
    );
    expect(renderToStaticMarkup(createElement(ReaderCounts, { counts: { want: 0, reading: 0, read: 0 }, t }))).toBe("");
    expect(renderToStaticMarkup(createElement(ReaderCounts, { counts: null, t }))).toBe("");
  });
});

describe("the readers' star split", () => {
  const props = { reviews: [], locale: "en", botHref: "https://t.me/kitob_javonim_bot", reviewHref: null, t: tr("en", en) };

  it("draws a bar per star, five first, with each share for a screen reader", () => {
    const html = renderToStaticMarkup(
      createElement(ReaderReviews, { ...props, rating: { average: 4.4, count: 162, stars: [11, 2, 2, 10, 137] } }),
    );
    expect(html).toContain("5 stars: 137 ratings (85%)");
    expect(html).toContain("1 star: 11 ratings (7%)");
    expect(html.indexOf("5★")).toBeLessThan(html.indexOf("1★"));
    expect(html).toContain('style="width:85%"');
  });

  it("is left out until the bot sends a split", () => {
    const html = renderToStaticMarkup(createElement(ReaderReviews, { ...props, rating: { average: 4.4, count: 162, stars: null } }));
    expect(html).not.toContain("★</span>");
  });
});
