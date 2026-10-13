import { ArrowRight, Star } from "lucide-react";
import type { ReaderRating, ReaderReview } from "@/lib/types";

/**
 * What readers of the Kitoblarim bot think of a book: their stars, counted
 * without names, and the reviews they chose to publish here (approved by an
 * editor before they reach the API).
 */
export function ReaderReviews({
  rating,
  reviews,
  locale,
  botHref,
  t,
}: {
  rating: ReaderRating | null | undefined;
  reviews: ReaderReview[];
  locale: string;
  botHref: string;
  t: (key: string, values?: Record<string, number>) => string;
}) {
  if (!rating && reviews.length === 0) return null;

  return (
    <section className="mt-16 sm:mt-20 border-t border-stone-200 pt-12 sm:pt-16">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl text-zinc-900">{t("readersTitle")}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t("readersLead")}</p>
        </div>
        {rating && (
          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1 font-serif text-2xl text-zinc-900">
              <Star className="h-5 w-5 fill-star text-star" aria-hidden="true" />
              {rating.average.toFixed(1)}
            </span>
            <span className="block text-xs text-zinc-500">{t("readersCount", { count: rating.count })}</span>
          </div>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-zinc-900 truncate">
                  {review.authorName || t("readerAnonymous")}
                </span>
                {review.rating ? <Stars rating={review.rating} /> : null}
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 whitespace-pre-line break-words">{review.body}</p>
              {review.writtenAt && (
                <time dateTime={review.writtenAt} className="mt-3 block text-xs text-zinc-400">
                  {new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(new Date(review.writtenAt))}
                </time>
              )}
            </article>
          ))}
        </div>
      )}

      <p className="mt-6 text-sm">
        <a
          href={botHref}
          target="_blank"
          rel="noopener"
          className="text-zinc-500 underline underline-offset-4 decoration-stone-300 hover:text-forest-800 hover:decoration-forest-800 transition-colors"
        >
          {t("readersRate")}
          <ArrowRight aria-hidden="true" className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
        </a>
      </p>
    </section>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex shrink-0 gap-0.5" role="img" aria-label={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={star <= rating ? "h-3.5 w-3.5 fill-star text-star" : "h-3.5 w-3.5 text-stone-300"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
