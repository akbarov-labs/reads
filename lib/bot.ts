/**
 * Links to the Kitoblarim Telegram bot, the reading tracker this catalogue
 * hands readers over to. Every link says where it came from (`reads`), which
 * the bot counts as a partner in its stats (docs/partners.md there).
 */
export const BOT_USERNAME = "kitob_javonim_bot";
const BOT_URL = `https://t.me/${BOT_USERNAME}`;
const PARTNER = "reads";

/** Plain link to the bot: the bot asks what the reader is reading now. */
export function botUrl(): string {
  return `${BOT_URL}?start=src_${PARTNER}`;
}

/**
 * "Plan reading this book": the bot finds the book by ISBN and asks how many
 * days the reader wants. A book that isn't in the bot's catalogue yet just
 * starts the bot's usual questions. Falls back to the plain link when the
 * ISBN is missing or malformed.
 */
export function botPlanUrl(isbn?: string | null): string {
  const digits = String(isbn ?? "").replace(/[^0-9Xx]/g, "");
  if (!/^[0-9Xx]{10,13}$/.test(digits)) return botUrl();
  return `${BOT_URL}?start=plan_${digits.toUpperCase()}_${PARTNER}`;
}
