import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import { joinPresent } from "@/lib/format";
import { getTranslatorStats } from "@/lib/translatorStats";
import { MetaLine } from "@/components/MetaLine";
import { StatsBar } from "@/components/StatsBar";
import { ProfileHeader } from "@/components/ProfileHeader";
import type { Translator } from "@/lib/types";
import uz from "@/messages/uz.json";

/** The visible text, tags dropped and spaces collapsed. */
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const translator: Translator = {
  slug: "ali-valiyev",
  name: "Ali Valiyev",
  avatarUrl: "https://dashboard.kitoblarim.uz/storage/ali.jpg",
  location: "Toshkent",
  bio: "Ingliz adabiyoti tarjimoni.",
  languagePairs: [{ from: "inglizcha", to: "oʻzbekcha" }],
  socialLinks: [],
  yearsActive: 12,
  startYear: 2014,
  totalBooksTranslated: 7,
  books: [],
};

// What Reads-admin sends for a profile nobody filled in past the name.
const bare: Translator = {
  ...translator,
  avatarUrl: "",
  location: "",
  bio: "",
  languagePairs: [],
  yearsActive: 0,
  totalBooksTranslated: 0,
};

const stats = createTranslator({ locale: "uz", messages: uz, namespace: "stats" });

function header(profile: Translator) {
  return renderToStaticMarkup(
    // The provider's props type requires children, so they go in the props.
    // eslint-disable-next-line react/no-children-prop
    createElement(NextIntlClientProvider, {
      locale: "uz",
      messages: uz,
      timeZone: "Asia/Tashkent",
      children: createElement(ProfileHeader, { translator: profile }),
    }),
  );
}

describe("joinPresent", () => {
  it("joins only the parts with a value", () => {
    expect(joinPresent(["Sharq", 2015])).toBe("Sharq · 2015");
    expect(joinPresent([null, 2015])).toBe("2015");
    expect(joinPresent(["Sharq", undefined])).toBe("Sharq");
  });

  it("is null when nothing has a value, zero and blanks included", () => {
    expect(joinPresent([null, undefined])).toBeNull();
    expect(joinPresent(["", 0])).toBeNull();
    expect(joinPresent(["  ", false])).toBeNull();
  });
});

describe("MetaLine", () => {
  it("renders the line, or nothing at all", () => {
    expect(renderToStaticMarkup(createElement(MetaLine, { parts: ["Sharq", 2015], className: "x" }))).toBe('<p class="x">Sharq · 2015</p>');
    expect(renderToStaticMarkup(createElement(MetaLine, { parts: [null, 0] }))).toBe("");
  });
});

describe("translator stats", () => {
  it("shows books and experience when there are some, and no count of language pairs", () => {
    expect(getTranslatorStats(stats as never, translator).map((stat) => stat.value)).toEqual(["7+", "12 yil"]);
  });

  it("never says 0 yil or 0+, and the bar disappears when nothing is left", () => {
    expect(getTranslatorStats(stats as never, bare)).toEqual([]);
    expect(renderToStaticMarkup(createElement(StatsBar, { stats: [] }))).toBe("");
    expect(getTranslatorStats(stats as never, { ...bare, totalBooksTranslated: 3 }).map((stat) => stat.value)).toEqual(["3+"]);
  });
});

describe("ProfileHeader", () => {
  it("shows the place, the bio and the inquiry button of a filled-in profile", () => {
    const html = header(translator);
    expect(text(html)).toContain("Toshkent");
    expect(text(html)).toContain("Ingliz adabiyoti tarjimoni.");
    expect(html).toContain("lucide-map-pin");
    expect(text(html)).toContain(uz.inquiry.cta);
  });

  it("shows the language pairs only as the form's choices, never as badges", () => {
    expect(text(header(translator))).not.toContain("inglizcha");
  });

  it("leaves out the pin, the bio and an unsendable form when they are empty", () => {
    const html = header(bare);
    expect(html).not.toContain("lucide-map-pin");
    expect(html).not.toContain("<img");
    expect(text(html)).not.toContain(uz.inquiry.cta);
    // Name and initial only: no empty paragraphs left holding space.
    expect(html).not.toMatch(/<p[^>]*>\s*<\/p>/);
    expect(text(html)).toBe("A Ali Valiyev");
  });
});
