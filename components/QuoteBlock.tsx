import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Quote } from "@/lib/types";
import { ShareLinks } from "@/components/ShareLinks";

/**
 * One line from a book, signed: the author, the page, and the translator
 * when the words are a translation's. On a book's page the book goes without
 * saying; as the quote of the day (`book`) it is named and linked. Shares
 * as itself, in quotation marks, with a link to the book.
 */
export async function QuoteBlock({
  quote,
  bookId,
  author,
  book,
  large = false,
}: {
  quote: Quote;
  bookId: string;
  author: string | null | undefined;
  /** The book's title, named and linked under the quote. */
  book?: string;
  large?: boolean;
}) {
  const t = await getTranslations("quotes");
  const translators = quote.translators ?? [];
  const signed = [author, book ? `«${book}»` : null].filter(Boolean).join(", ");

  return (
    <figure className={large ? "" : "rounded-2xl border border-stone-200 bg-white p-5"}>
      <blockquote
        className={`font-serif text-zinc-800 whitespace-pre-line ${large ? "text-2xl sm:text-3xl leading-snug" : "text-[17px] leading-relaxed"}`}
      >
        «{quote.body}»
      </blockquote>
      <figcaption className={`${large ? "mt-5 text-sm" : "mt-3 text-xs"} text-zinc-500`}>
        {signed && (
          <>
            —{" "}
            {book ? (
              <Link href={`/book/${bookId}`} className="text-forest-800 hover:underline underline-offset-4">
                {signed}
              </Link>
            ) : (
              signed
            )}
          </>
        )}
        {quote.page ? <span>{signed ? " · " : ""}{t("quotePage", { page: quote.page })}</span> : null}
        {translators.length > 0 && (
          <span className="block mt-0.5">{t("quoteTranslatedBy", { names: translators.join(", ") })}</span>
        )}
      </figcaption>
      <ShareLinks
        path={`/book/${bookId}`}
        text={`«${quote.body}»${author ? ` — ${author}` : ""}`}
        size="sm"
        className={large ? "mt-5" : "mt-3"}
      />
    </figure>
  );
}
