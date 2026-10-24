import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookDescription, isLongDescription } from "@/components/BookDescription";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import uz from "@/messages/uz.json";

const render = (text: string) =>
  renderToStaticMarkup(createElement(BookDescription, { text, moreLabel: "Show more", lessLabel: "Show less" }));

const long = ["Kitob haqida.", "", "Kitob davomida:", "• sabr;", "• umid.", "", "Oxirgi gap. ".repeat(60)].join("\n");

describe("the book description", () => {
  it("opens a long one collapsed, with the whole text still in the page", () => {
    const html = render(long);
    expect(html).toContain("max-h-[6lh] overflow-hidden");
    expect(html).toContain("Kitob davomida:\n• sabr;\n• umid.");
    expect(html).toContain(`Oxirgi gap. `.repeat(60).trim());
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*aria-controls="([^"]+)"[^>]*>Show more/);
    const controls = html.match(/aria-controls="([^"]+)"/)?.[1];
    expect(html).toContain(`<p id="${controls}"`);
  });

  it("shows a short one whole, with no button", () => {
    const html = render("Kitob haqida.\n\nIkkinchi qism.");
    expect(html).not.toContain("max-h-");
    expect(html).not.toContain("<button");
    expect(html).toContain("whitespace-pre-line");
  });

  it("counts long by length or by lines", () => {
    expect(isLongDescription("a".repeat(600))).toBe(false);
    expect(isLongDescription("a".repeat(601))).toBe(true);
    expect(isLongDescription(Array(8).fill("• band").join("\n"))).toBe(false);
    expect(isLongDescription(Array(9).fill("• band").join("\n"))).toBe(true);
  });

  it("has its labels in every language", () => {
    expect([uz, ru, en].map((m) => [m.bookDetail.descriptionMore, m.bookDetail.descriptionLess])).toEqual([
      ["Koʻproq", "Kamroq"],
      ["Подробнее", "Свернуть"],
      ["Show more", "Show less"],
    ]);
  });
});
