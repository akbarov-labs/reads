import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { askAiUrl } from "@/lib/askAi";

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
