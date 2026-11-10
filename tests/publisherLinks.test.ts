import { describe, expect, it } from "vitest";
import { publisherLinks, publisherShop } from "@/lib/publisherLinks";

const base = { slug: "hilol-nashr", name: "Hilol-nashr", bookCount: 1 };

describe("publisherLinks", () => {
  it("links the channel, Instagram and website in that order", () => {
    expect(
      publisherLinks({ ...base, telegramChannel: "hilolnashr", instagram: "hilol.nashr", websiteUrl: "https://www.hilol.uz/" }),
    ).toEqual([
      { kind: "telegram", href: "https://t.me/hilolnashr", label: "@hilolnashr" },
      { kind: "instagram", href: "https://www.instagram.com/hilol.nashr/", label: "Instagram" },
      { kind: "website", href: "https://www.hilol.uz/", label: "hilol.uz" },
    ]);
  });

  it("leaves out anything that is not a username or a web address", () => {
    expect(
      publisherLinks({ ...base, telegramChannel: "t.me/x?y", instagram: "not a name", websiteUrl: "javascript:alert(1)" }),
    ).toEqual([]);
    expect(publisherLinks(base)).toEqual([]);
  });
});

describe("publisherShop", () => {
  it("labels a Telegram shop by its name, Uzum by name, and anything else by its address", () => {
    expect(publisherShop({ ...base, shopUrl: "https://t.me/Oltinqalam_books" })).toEqual({
      href: "https://t.me/Oltinqalam_books",
      label: "@Oltinqalam_books",
    });
    expect(publisherShop({ ...base, shopUrl: "https://uzum.uz/uz/shop/tahlilnashr" })?.label).toBe("Uzum Market");
    expect(publisherShop({ ...base, shopUrl: "https://www.hilolnashr.uz/" })?.label).toBe("hilolnashr.uz");
  });

  it("is nothing for a missing or unsafe address", () => {
    expect(publisherShop(base)).toBeNull();
    expect(publisherShop({ ...base, shopUrl: "javascript:alert(1)" })).toBeNull();
  });

  it("is not repeated among the other links when the channel is the shop", () => {
    expect(
      publisherLinks({ ...base, telegramChannel: "oltinqalam_books", shopUrl: "https://t.me/oltinqalam_books" }),
    ).toEqual([]);
  });
});
