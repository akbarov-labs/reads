import { ArrowRight, PenLine, Star } from "lucide-react";
import type { ReaderRating, ReaderReview } from "@/lib/types";

/**
 * What readers of the Kitoblarim bot think of a book: their stars, counted
 * without names, and the reviews they chose to publish here (approved by an
 * editor before they reach the API). Shown on every book, even one nobody
 * has rated yet: that is where a reader who has read it is asked to write
 * the first review, in the bot (reviewHref).
 */
export function ReaderReviews({
  rating,
  reviews,
  locale,
  botHref,
  reviewHref,
  t,
}: {
  rating: ReaderRating | null | undefined;
  reviews: ReaderReview[];
  locale: string;
  botHref: string;
  /** The bot's "write a review" link for this book; null without an ISBN. */
  reviewHref: string | null;
  t: (key: string, values?: Record<string, number>) => string;
}) {
  const empty = !rating && reviews.length === 0;

  return (
    <section className="mt-16 sm:mt-20 border-t border-stone-200 pt-12 sm:pt-16">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl text-zinc-900">{t("readersTitle")}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t(empty ? "readersEmpty" : "readersLead")}</p>
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

      {rating?.stars && <StarSplit stars={rating.stars} t={t} />}

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

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {reviewHref && (
          <a
            href={reviewHref}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-xl py-2 pl-2 pr-3.5 font-medium text-forest-700 transition-colors duration-200 hover:bg-forest-100"
          >
            <PenLine aria-hidden="true" className="h-4 w-4 shrink-0" />
            {t("readersWrite")}
          </a>
        )}
        <a
          href={botHref}
          target="_blank"
          rel="noopener"
          className="text-zinc-500 underline underline-offset-4 decoration-stone-300 hover:text-forest-800 hover:decoration-forest-800 transition-colors"
        >
          {t("readersRate")}
          <ArrowRight aria-hidden="true" className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
        </a>
      </div>
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

/**
 * How the ratings split, five stars first, as bars of the share each holds.
 * The bars are drawn for the eye; each row's sentence is there for a screen
 * reader ("5 yulduz: 137 ta baho (85%)").
 */
function StarSplit({
  stars,
  t,
}: {
  stars: number[];
  t: (key: string, values?: Record<string, number>) => string;
}) {
  const total = stars.reduce((sum, count) => sum + count, 0);
  if (total === 0) return null;

  return (
    <dl className="mt-6 max-w-md space-y-1.5" aria-label={t("readersStarsLabel")}>
      {[5, 4, 3, 2, 1].map((star) => {
        const count = stars[star - 1] ?? 0;
        const percent = Math.round((count / total) * 100);
        return (
          <div key={star} className="flex items-center gap-3 text-xs text-zinc-500">
            <dt className="w-7 shrink-0 tabular-nums">
              <span aria-hidden="true">{star}★</span>
              <span className="sr-only">{t("readersStarsRow", { stars: star, count, percent })}</span>
            </dt>
            <dd className="flex flex-1 items-center gap-3" aria-hidden="true">
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
                <span className="block h-full rounded-full bg-star" style={{ width: `${percent}%` }} />
              </span>
              <span className="w-9 shrink-0 text-right tabular-nums">{percent}%</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
