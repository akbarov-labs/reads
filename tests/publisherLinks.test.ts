import { describe, expect, it } from "vitest";
import { publisherLinks } from "@/lib/publisherLinks";

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
