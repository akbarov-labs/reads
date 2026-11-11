import type { Author } from "@/lib/types";

/**
 * The line under an author's name: their years and country, as far as
 * they are known — "1821–1881 · Rossiya", "1947 · AQSh", "?–1111". Null
 * when the catalogue knows neither.
 */
export function authorLifeLine(author: Pick<Author, "birthYear" | "deathYear" | "nationality">): string | null {
  const born = author.birthYear ?? null;
  const died = author.deathYear ?? null;
  const years = born !== null && died !== null ? `${born}–${died}` : died !== null ? `?–${died}` : born !== null ? String(born) : null;
  const country = author.nationality?.trim() || null;
  const parts = [years, country].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(" · ") : null;
}
