import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "next-intl";
import { LibraryAvailability } from "@/components/LibraryAvailability";
import { shortDate } from "@/lib/format";
import { libraryPageGraph } from "@/lib/jsonld";
import type { Library, LibraryAvailability as Availability } from "@/lib/types";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import uz from "@/messages/uz.json";

// The locale-aware Link needs Next's router; a plain anchor is enough here.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) =>
    createElement("a", { href, className }, children),
}));

type Translate = (key: string, values?: Record<string, string | number>) => string;
const tr = (locale: string, messages: typeof en) =>
  createTranslator({ locale, messages, namespace: "bookDetail" }) as unknown as Translate;

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function library(overrides: Partial<Availability> = {}): Availability {
  return {
    slug: "mehr",
    name: "Mehr kutubxonasi",
    region: "Toshkent shahri",
    district: "Shayxontohur tumani",
    copiesTotal: 2,
    copiesAvailable: 1,
    updatedAt: "2026-10-24T09:00:00Z",
    stale: false,
    ...overrides,
  };
}

describe("shortDate", () => {
  it("names the day in each language", () => {
    expect(shortDate("2026-10-24T09:00:00Z", "uz")).toBe("24-oktabr");
    expect(shortDate("2026-10-24T09:00:00Z", "ru")).toBe("24 октября");
    expect(shortDate("2026-10-24T09:00:00Z", "en")).toBe("24 October");
  });

  it("is the day in Tashkent, five hours ahead of UTC", () => {
    expect(shortDate("2026-10-24T20:30:00Z", "uz")).toBe("25-oktabr");
    expect(shortDate("2026-10-24T20:30:00Z", "ru")).toBe("25 октября");
  });

  it("is nothing for no date or a bad one", () => {
    expect(shortDate(null, "uz")).toBeNull();
    expect(shortDate("not a date", "uz")).toBeNull();
  });
});

describe("LibraryAvailability", () => {
  const render = (libraries: Availability[] | undefined, locale = "uz", messages = uz as typeof en) =>
    renderToStaticMarkup(createElement(LibraryAvailability, { libraries, locale, t: tr(locale, messages) }));

  it("lists each library, its district, as of when, and whether a copy is in", () => {
    const html = render([library(), library({ slug: "idrok", name: "Idrok", district: null, region: "Toshkent viloyati", copiesAvailable: 0 })]);

    expect(text(html)).toContain("Mehr kutubxonasi Shayxontohur tumani · 24-oktabr holatiga 1 ta bor");
    expect(text(html)).toContain("Idrok Toshkent viloyati · 24-oktabr holatiga hammasi band");
    expect(html).toContain('href="/library/mehr"');
  });

  it("warns when a list is old", () => {
    expect(text(render([library({ stale: true })]))).toContain("maʼlumot eskirgan boʻlishi mumkin");
  });

  it("keeps the fifth library onwards behind 'more'", () => {
    const many = Array.from({ length: 6 }, (_, i) => library({ slug: `l${i}`, name: `Kutubxona ${i}` }));
    const html = render(many, "ru", ru as typeof en);

    expect(text(html)).toContain("Ещё 2 библиотеки");
    expect(html.indexOf("Kutubxona 4")).toBeGreaterThan(html.indexOf("<details"));
  });

  it("is nothing at all when no library holds the book", () => {
    expect(render([])).toBe("");
    expect(render(undefined)).toBe("");
  });

  it("counts copies in English", () => {
    expect(text(render([library({ copiesAvailable: 2 })], "en", en))).toContain("2 copies in");
  });
});

describe("libraryPageGraph", () => {
  const mehr: Library = {
    slug: "mehr",
    name: "Mehr kutubxonasi",
    region: "Toshkent shahri",
    district: "Shayxontohur tumani",
    address: "Chorsu, 2-xona",
    phone: "+998 90 123 45 67",
    telegramUrl: "https://t.me/mehr",
    instagramUrl: "javascript:alert(1)",
    latitude: 41.326,
    longitude: 69.235,
    stale: false,
  };

  it("is a Library with its address, phone, place on the map and safe links only", () => {
    const graph = JSON.parse(
      JSON.stringify(libraryPageGraph({ library: mehr, locale: "uz", path: "/library/mehr", trail: [{ name: "Kitoblarim", path: "" }] })),
    );
    const node = graph["@graph"].find((n: { "@type": string }) => n["@type"] === "Library");

    expect(node.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "Chorsu, 2-xona",
      addressLocality: "Shayxontohur tumani",
      addressRegion: "Toshkent shahri",
      addressCountry: "UZ",
    });
    expect(node.telephone).toBe("+998 90 123 45 67");
    expect(node.geo).toEqual({ "@type": "GeoCoordinates", latitude: 41.326, longitude: 69.235 });
    expect(node.sameAs).toEqual(["https://t.me/mehr"]);
  });
});
