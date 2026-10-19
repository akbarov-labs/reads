import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import { taqrizShareText, telegramShareUrl } from "@/lib/share";
import en from "@/messages/en.json";
import uz from "@/messages/uz.json";

type Translate = Parameters<typeof taqrizShareText>[1];
const t = (locale: string, messages: typeof en) =>
  createTranslator({ locale, messages, namespace: "taqriz" }) as unknown as Translate;

describe("telegramShareUrl", () => {
  it("opens Telegram's share sheet with the link and the line above it", () => {
    const url = new URL(telegramShareUrl("https://kitoblarim.uz/uz/book/18", "1984 — Jorj Oruell"));
    expect(url.origin + url.pathname).toBe("https://t.me/share/url");
    expect(url.searchParams.get("url")).toBe("https://kitoblarim.uz/uz/book/18");
    expect(url.searchParams.get("text")).toBe("1984 — Jorj Oruell");
  });
});

describe("taqrizShareText", () => {
  it("names the reviewer and the book", () => {
    expect(taqrizShareText({ name: "Dilnoza", title: "1984" }, t("uz", uz as typeof en))).toBe("Dilnoza — «1984» haqida taqriz");
    expect(taqrizShareText({ name: "Dilnoza", title: "1984" }, t("en", en))).toBe("Dilnoza on “1984”");
  });

  it("makes do with whichever half it has", () => {
    expect(taqrizShareText({ name: null, title: "1984" }, t("en", en))).toBe("1984");
    expect(taqrizShareText({ name: "Dilnoza" }, t("en", en))).toBe("Dilnoza");
  });
});
