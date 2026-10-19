type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * The line a shared taqriz carries in Telegram: "Dilnoza — «1984» haqida
 * taqriz". A card on a book page knows the reviewer, one on a reviewer's
 * page knows the book; whichever is missing, the other alone is enough.
 */
export function taqrizShareText(
  { name, title }: { name?: string | null; title?: string | null },
  t: Translate,
): string {
  if (name && title) return t("shareText", { name, title });
  return name || title || "";
}

/** Telegram's own share sheet for a link, with a line of text above it. */
export function telegramShareUrl(url: string, text: string): string {
  return `https://t.me/share/url?${new URLSearchParams({ url, text })}`;
}
