type Translate = (key: string, values?: Record<string, string | number>) => string;

/** The pages that carry an ask-AI button, as Reads-admin's click log names them. */
export const ASK_AI_SUBJECTS = ["book", "author", "translator", "publisher"] as const;
export type AskAiSubject = (typeof ASK_AI_SUBJECTS)[number];

/**
 * Where an ask-AI button points: this site's own redirect (app/go/ai),
 * which counts the click and sends the reader on to askAiUrl. The question
 * is built there from the catalogue, so it never travels in the link.
 */
export function askAiRedirectPath(subject: AskAiSubject, id: string, locale: string): string {
  return `/go/ai/${subject}/${encodeURIComponent(id)}?l=${encodeURIComponent(locale)}`;
}

/**
 * Google's AI Mode (Gemini behind Google Search) with the question already
 * asked. gemini.google.com itself ignores a question in its address, so a
 * link can only open it empty; AI Mode answers at once, needs no sign-in,
 * and `hl` puts Google's own buttons in the reader's language.
 */
export function askAiUrl(question: string, locale: string): string {
  return `https://www.google.com/search?${new URLSearchParams({ udm: "50", hl: locale, q: question })}`;
}

/**
 * "Xadicha Kubro Tongar (Hatice Kübra Tongar)": the name the catalogue
 * shows, and the one the rest of the world knows, which is what the answer
 * is found under.
 */
function withOriginal(name: string, original?: string | null): string {
  const other = original?.trim();
  return other && other !== name ? `${name} (${other})` : name;
}

export function bookQuestion(
  book: { uzbekTitle: string; originalTitle?: string | null; author?: string | null },
  t: Translate,
): string {
  const title = withOriginal(book.uzbekTitle, book.originalTitle);
  return book.author ? t("bookByAuthor", { title, author: book.author }) : t("book", { title });
}

export function authorQuestion(author: { name: string; originalName?: string | null }, t: Translate): string {
  return t("author", { name: withOriginal(author.name, author.originalName) });
}

export function translatorQuestion(translator: { name: string }, t: Translate): string {
  return t("translator", { name: translator.name });
}

export function publisherQuestion(publisher: { name: string }, t: Translate): string {
  return t("publisher", { name: publisher.name });
}
