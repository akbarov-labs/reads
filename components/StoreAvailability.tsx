import { ArrowUpRight } from "lucide-react";
import { formatSum } from "@/lib/announcements";
import { shortDate } from "@/lib/format";
import { arrangeOffers } from "@/lib/storeOffers";
import { storeRedirectPath } from "@/lib/stores";
import type { StoreOffer } from "@/lib/types";

type T = (key: string, values?: Record<string, string | number>) => string;

/**
 * "Doʻkonlarda": the stores whose own page for this book the catalogue read
 * lately, with its price and whether they had it, as of that read. Nothing
 * at all when none was read: the store searches below stand in.
 *
 * Kept short (lib/storeOffers.ts): stores that have it first, at most three
 * in view, the rest and the sold-out ones under "Yana N ta doʻkon". Two
 * quiet labels, only when true: "eng arzon" and "nashriyot" (the
 * publisher's own shop).
 *
 * Laid out like LibraryAvailability. Status is ink, not colour (the One
 * Accent Rule): a filled forest dot for in stock, a hollow one for sold
 * out. The store's name is the link, through /go/store, which counts the
 * click and opens the store's page for the book.
 */
export function StoreAvailability({
  offers,
  bookId,
  locale,
  t,
  className = "",
}: {
  offers: StoreOffer[] | undefined;
  bookId: string;
  locale: string;
  t: T;
  className?: string;
}) {
  if (!offers || offers.length === 0) return null;

  const { shown, more, cheapest } = arrangeOffers(offers);
  const row = (offer: StoreOffer) => (
    <StoreRow key={offer.store} offer={offer} cheapest={offer.store === cheapest} bookId={bookId} locale={locale} t={t} />
  );

  return (
    <div className={className}>
      <h3 className="text-sm font-medium text-zinc-900">{t("storesTitle")}</h3>
      <ul className="mt-3 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">{shown.map(row)}</ul>
      {more.length > 0 ? (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-sm font-medium text-forest-700 hover:text-forest-800 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">{t("storesMore", { count: more.length })}</span>
          </summary>
          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">{more.map(row)}</ul>
        </details>
      ) : null}
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{t("storesNote")}</p>
    </div>
  );
}

function StoreRow({
  offer,
  cheapest,
  bookId,
  locale,
  t,
}: {
  offer: StoreOffer;
  cheapest: boolean;
  bookId: string;
  locale: string;
  t: T;
}) {
  const checked = shortDate(offer.checkedAt, locale);
  const status =
    offer.inStock === true
      ? offer.left
        ? t("storeLeft", { count: offer.left })
        : t("storeInStock")
      : offer.inStock === false
        ? t("storeSoldOut")
        : null;

  return (
    <li className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        {/* A plain <a>, not next/link: a prefetch would not be a click. */}
        <a
          href={storeRedirectPath(offer.store, bookId, locale)}
          target="_blank"
          rel="nofollow noopener"
          className="inline-flex items-center gap-1 font-serif text-base text-zinc-900 hover:text-forest-800"
        >
          {offer.name}
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
        <p className="mt-0.5 text-xs text-zinc-500">
          {offer.fromPublisher ? <span className="font-medium text-zinc-700">{t("storePublisher")}</span> : null}
          {offer.fromPublisher && checked ? " · " : null}
          {checked ? t("libChecked", { date: checked }) : null}
        </p>
      </div>
      <div className="shrink-0 pt-0.5 text-right text-sm tabular-nums text-zinc-700">
        {offer.price ? (
          <p className="font-medium text-zinc-900">{t("storePrice", { price: formatSum(offer.price, locale) })}</p>
        ) : null}
        {cheapest ? <p className="text-xs font-medium text-forest-800">{t("storeCheapest")}</p> : null}
        {status ? (
          <p className="mt-0.5 flex items-center justify-end gap-1.5">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${offer.inStock ? "bg-forest-700" : "border border-stone-300"}`}
            />
            {status}
          </p>
        ) : null}
      </div>
    </li>
  );
}
