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
 * The buttons on this site's page about the bot (/bot). Their own partner
 * name, so the bot's /stats shows how many readers that page brings.
 */
export function botPageUrl(): string {
  return `${BOT_URL}?start=src_${PARTNER}-botpage`;
}

/**
 * "Tavsiya": the bot goes straight to choosing the reader's next book (its
 * "Keyingi kitobim" questions, docs/bookseller.md there), from what is on
 * their shelf. Each place on the site has a partner name of its own, so the
 * bot's /stats can tell the header from the home page and from book pages.
 */
export function botRecommendUrl(place: "header" | "home"): string {
  return `${BOT_URL}?start=next_${PARTNER}-${place}`;
}

/**
 * "Plan reading this book": the bot finds the book by ISBN and asks how many
 * days the reader wants. A book that isn't in the bot's catalogue yet just
 * starts the bot's usual questions. Falls back to the plain link when the
 * ISBN is missing or malformed.
 */
export function botPlanUrl(isbn?: string | null): string {
  const digits = isbnDigits(isbn);
  return digits ? `${BOT_URL}?start=plan_${digits}_${PARTNER}` : botUrl();
}

/**
 * "Save it for later": the bot puts the book on the reader's "Oʻqiyman"
 * shelf. Null without a usable ISBN, since there is then nothing to save.
 */
export function botWantUrl(isbn?: string | null): string | null {
  const digits = isbnDigits(isbn);
  return digits ? `${BOT_URL}?start=want_${digits}_${PARTNER}` : null;
}

/**
 * "Write a review": the bot puts the book on the reader's shelf and opens
 * its page in the app at the review, which reaches this site once an editor
 * approves it (the bot's docs/partners.md, link 5). Null without a usable
 * ISBN, since the bot then has no book to open.
 */
export function botReviewUrl(isbn?: string | null): string | null {
  const digits = isbnDigits(isbn);
  return digits ? `${BOT_URL}?start=review_${digits}_${PARTNER}` : null;
}

/**
 * Where a book page's "write a review" button points: this site's own
 * redirect (app/go/review), which counts the click and sends the reader on
 * to botReviewUrl. Null when the book has no usable ISBN, as there is then
 * no review link to send them to.
 */
export function botReviewRedirectPath(bookId: string, locale: string, isbn?: string | null): string | null {
  return isbnDigits(isbn) ? `/go/review/${encodeURIComponent(bookId)}?l=${encodeURIComponent(locale)}` : null;
}

/** The ISBN the bot finds a book by: any printing with one will do. */
export function bookIsbn(book: { editions?: { isbn?: string | null }[] | null }): string | undefined {
  return book.editions?.find((edition) => edition.isbn)?.isbn ?? undefined;
}

/** An ISBN's digits (and check digit X), or null when it can't be one. */
function isbnDigits(isbn?: string | null): string | null {
  const digits = String(isbn ?? "").replace(/[^0-9Xx]/g, "");
  return /^[0-9Xx]{10,13}$/.test(digits) ? digits.toUpperCase() : null;
}
