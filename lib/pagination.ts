export type PageItem = number | "…";

/** At most 7 page buttons, the middle collapsed with "…" when needed. */
export function pageNumbers(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
  if (currentPage >= totalPages - 3) {
    return [1, "…", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "…", currentPage - 1, currentPage, currentPage + 1, "…", totalPages];
}

/**
 * At most 5, for a phone: with the two arrows that's 7 buttons of 36px, which
 * just fits the 272px a 320px screen leaves. The first, last and current page
 * are always there.
 */
export function compactPageNumbers(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 2) return [1, 2, 3, "…", totalPages];
  if (currentPage >= totalPages - 1) return [1, "…", totalPages - 2, totalPages - 1, totalPages];
  return [1, "…", currentPage, "…", totalPages];
}
