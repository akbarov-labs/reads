"use client";

import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  function pageHref(page: number) {
    return page === 1 ? basePath : `${basePath}?page=${page}`;
  }

  // Show at most 7 page buttons; collapse the middle with "…" when needed.
  function getPageNumbers(): (number | "…")[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "…", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [
        1,
        "…",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      "…",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "…",
      totalPages,
    ];
  }

  const pages = getPageNumbers();

  return (
    <nav
      className="flex items-center justify-center gap-1 mt-12"
      aria-label="Pagination"
    >
      {/* Previous */}
      {currentPage > 1 ? (
        <Link
          href={pageHref(currentPage - 1)}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-stone-100 rounded-lg transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Link>
      ) : (
        <span className="flex items-center gap-1 px-3 py-2 text-sm text-zinc-300 cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
          Prev
        </span>
      )}

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {pages.map((page, i) =>
          page === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="w-9 h-9 flex items-center justify-center text-sm text-zinc-400"
            >
              …
            </span>
          ) : (
            <Link
              key={page}
              href={pageHref(page)}
              className={`w-9 h-9 flex items-center justify-center text-sm rounded-lg font-medium transition-colors ${
                page === currentPage
                  ? "bg-amber-700 text-white"
                  : "text-zinc-600 hover:bg-stone-100 hover:text-zinc-900"
              }`}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </Link>
          )
        )}
      </div>

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={pageHref(currentPage + 1)}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-stone-100 rounded-lg transition-colors"
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="flex items-center gap-1 px-3 py-2 text-sm text-zinc-300 cursor-not-allowed">
          Next
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
