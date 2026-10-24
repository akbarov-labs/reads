/**
 * Where an announcement's order button sends the reader: a chat with the
 * publisher's order account on Telegram, with a message already typed that
 * names the book and kitoblarim.uz. `t.me/<username>?text=` is Telegram's
 * documented public-username link with a draft (core.telegram.org/api/links,
 * checked 2026-10-24): the app opens the chat with the text in the input
 * bar, and the reader only presses send.
 */
import { createTranslator } from "next-intl";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import uz from "@/messages/uz.json";
import type { Announcement } from "@/lib/types";

const MESSAGES = { uz, ru, en };

/** A public Telegram username, as Reads-admin stores it (no @). */
const USERNAME = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;

/** A post on a public channel: the fallback when a publisher has no order account. */
const POST_URL = /^https:\/\/t\.me\/[A-Za-z0-9_]{4,32}\/\d{1,12}$/;

export function orderMessage(title: string, locale: string): string {
  const messages = MESSAGES[locale as keyof typeof MESSAGES] ?? MESSAGES.uz;
  const t = createTranslator({ locale, messages, namespace: "announcements" });

  return t("orderMessage", { title });
}

/**
 * The order chat, or the announcement's own post when the publisher has no
 * order account (its comments or pinned contacts are the way to order then).
 * Null when neither is a Telegram address this site would send anyone to.
 */
export function orderUrl(
  announcement: Pick<Announcement, "title" | "orderContact" | "sourceUrl">,
  locale: string,
): string | null {
  if (announcement.orderContact && USERNAME.test(announcement.orderContact)) {
    return `https://t.me/${announcement.orderContact}?text=${encodeURIComponent(orderMessage(announcement.title, locale))}`;
  }

  return POST_URL.test(announcement.sourceUrl) ? announcement.sourceUrl : null;
}

/** Where the order button points: this site's counting redirect. */
export function orderRedirectPath(id: string, locale: string): string {
  return `/go/order/${encodeURIComponent(id)}?l=${encodeURIComponent(locale)}`;
}
