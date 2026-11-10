import type { Publisher } from "@/lib/types";
import { safeExternalUrl } from "@/lib/safeUrl";

export type PublisherLink = { kind: "telegram" | "instagram" | "website"; href: string; label: string };

const TELEGRAM_USERNAME = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;
const INSTAGRAM_USERNAME = /^[A-Za-z0-9._]{1,30}$/;

/**
 * Where a publisher can be found outside the site, in the order the page
 * shows them: its Telegram channel, Instagram, then its own website. The
 * admin stores bare usernames; anything that is not one is left out rather
 * than turned into a link.
 */
export function publisherLinks(publisher: Publisher): PublisherLink[] {
  const links: PublisherLink[] = [];

  if (publisher.telegramChannel && TELEGRAM_USERNAME.test(publisher.telegramChannel)) {
    links.push({ kind: "telegram", href: `https://t.me/${publisher.telegramChannel}`, label: `@${publisher.telegramChannel}` });
  }

  if (publisher.instagram && INSTAGRAM_USERNAME.test(publisher.instagram)) {
    links.push({ kind: "instagram", href: `https://www.instagram.com/${publisher.instagram}/`, label: "Instagram" });
  }

  const website = safeExternalUrl(publisher.websiteUrl);
  if (website) {
    links.push({ kind: "website", href: website, label: new URL(website).hostname.replace(/^www\./, "") });
  }

  const shop = publisherShop(publisher);
  return shop ? links.filter((link) => !sameUrl(link.href, shop.href)) : links;
}

/**
 * The publisher's official shop, shown apart from its other links since
 * buying there is often cheapest. Labelled by where it is: "@name" for a
 * Telegram shop, "Uzum Market", or the site's own address.
 */
export function publisherShop(publisher: Publisher): { href: string; label: string } | null {
  const href = safeExternalUrl(publisher.shopUrl);
  if (!href) return null;

  const url = new URL(href);
  const host = url.hostname.replace(/^www\./, "");
  const telegram = host === "t.me" ? url.pathname.replace(/^\/|\/$/g, "") : null;

  if (telegram !== null) {
    return TELEGRAM_USERNAME.test(telegram) ? { href, label: `@${telegram}` } : null;
  }

  return { href, label: host === "uzum.uz" ? "Uzum Market" : host };
}

function sameUrl(a: string, b: string): boolean {
  const key = (url: string) => url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
  return key(a) === key(b);
}
