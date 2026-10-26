import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { askAiUrl } from "@/lib/askAi";

/**
 * The same question as AskAiSection, as a plate right under what the page
 * says about its subject. Most of the catalogue has a short or borrowed
 * description, and asking an AI is often the most a reader can learn here,
 * so it sits where the reader is still reading, not after everything else.
 */
export async function AskAiButton({
  question,
  label,
  hint,
  className = "",
}: {
  question: string;
  label: string;
  hint: string;
  className?: string;
}) {
  const locale = await getLocale();

  return (
    <a
      href={askAiUrl(question, locale)}
      target="_blank"
      rel="nofollow noopener"
      className={`group flex items-start gap-3 rounded-xl border border-forest-300 bg-forest-50 p-4 text-left transition-colors hover:border-forest-400 hover:bg-forest-100 ${className}`}
    >
      <Sparkles aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-forest-700" />
      <span className="text-sm leading-relaxed">
        {/* Inline, so the arrow wraps with the last word, not apart from it. */}
        <span className="font-medium text-forest-800">
          {label}
          <ArrowUpRight
            aria-hidden="true"
            className="ml-1 inline h-3.5 w-3.5 align-[-2px] transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </span>
        <span className="mt-0.5 block text-zinc-600">{hint}</span>
      </span>
    </a>
  );
}

/**
 * "Want to know more?": the question this page raises, asked in the reader's
 * language in a new tab. It closes the page rather than opening it, so the
 * reader meets everything Kitoblarim has first, and the new tab leaves this
 * one where it was.
 *
 * A plain link: nothing here calls an AI or holds a key. nofollow, because
 * it is a search, not a page we vouch for.
 */
export async function AskAiSection({ question, className = "" }: { question: string; className?: string }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("askAi")]);

  return (
    <section className={`border-t border-stone-200 ${className}`} aria-labelledby="ask-ai">
      <h2 id="ask-ai" className="font-serif text-lg text-zinc-900">
        {t("title")}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">{t("lead")}</p>
      <a
        href={askAiUrl(question, locale)}
        target="_blank"
        rel="nofollow noopener"
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm text-zinc-700 transition-colors hover:border-forest-400 hover:text-forest-800"
      >
        <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span>{t("label")}</span>
        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
      </a>
    </section>
  );
}
