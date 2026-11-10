import type { StoreOffer } from "@/lib/types";

/** Rows shown before "Yana N ta doʻkon"; the rest open in place. */
export const SHOWN_STORES = 3;

/**
 * How the book page lays out its store rows, so the list stays short:
 * - in stock first, then the cheapest (the order the API sends);
 * - when any store has the book, those that don't fold away under "more";
 * - at most SHOWN_STORES rows in view, the rest under "more" too;
 * - "eng arzon" on one row only, and only when it's true: two or more
 *   stores have it in stock with a price, and one is cheaper than all others.
 */
export function arrangeOffers(offers: StoreOffer[] | undefined): {
  shown: StoreOffer[];
  more: StoreOffer[];
  cheapest: string | null;
} {
  const all = offers ?? [];
  const inStock = all.filter((offer) => offer.inStock === true);
  const lead = inStock.length > 0 ? inStock : all;
  const folded = inStock.length > 0 ? all.filter((offer) => offer.inStock !== true) : [];

  const priced = inStock.filter((offer) => offer.price != null && offer.price > 0);
  let cheapest: string | null = null;

  if (priced.length >= 2) {
    const lowest = Math.min(...priced.map((offer) => offer.price!));
    const atLowest = priced.filter((offer) => offer.price === lowest);
    if (atLowest.length === 1) cheapest = atLowest[0].store;
  }

  return {
    shown: lead.slice(0, SHOWN_STORES),
    more: [...lead.slice(SHOWN_STORES), ...folded],
    cheapest,
  };
}
