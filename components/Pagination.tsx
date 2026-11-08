"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type PageItem, compactPageNumbers, pageNumbers } from "@/lib/pagination";

const ARROW_CLASS = "flex h-9 min-w-9 items-center justify-center gap-1 text-sm sm:px-3";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /**
   * Path without the locale, e.g. "/books" — the i18n Link adds the locale
   * itself, so passing "/uz/books" would link to /uz/uz/books.
   */
  basePath: string;
  /** Other query parameters to keep on every page link (filters, search). */
  query?: Record<string, string | undefined>;
}

export function Pagination({ currentPage, totalPages, basePath, query = {} }: PaginationProps) {
  const t = useTranslations("pagination");
  if (totalPages <= 1) return null;

  function pageHref(page: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
    if (page > 1) params.set("page", String(page));

    const search = params.toString();
    return search ? `${basePath}?${search}` : basePath;
  }

  function pageItems(items: PageItem[]) {
    return items.map((page, i) =>
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
              ? "bg-forest-700 text-white"
              : "text-zinc-600 hover:bg-stone-100 hover:text-zinc-900"
          }`}
          aria-label={t("page", { page })}
          aria-current={page === currentPage ? "page" : undefined}
        >
          {page}
        </Link>
      ),
    );
  }

  return (
    <nav
      className="flex items-center justify-center gap-0.5 mt-12 sm:gap-1"
      aria-label={t("nav")}
    >
      {/* Previous: the word needs more room than a phone has */}
      {currentPage > 1 ? (
        <Link
          href={pageHref(currentPage - 1)}
          className={`${ARROW_CLASS} font-medium text-zinc-600 hover:text-zinc-900 hover:bg-stone-100 rounded-lg transition-colors`}
          aria-label={t("previousPage")}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("previous")}</span>
        </Link>
      ) : (
        <span aria-hidden="true" className={`invisible ${ARROW_CLASS}`}>
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("previous")}</span>
        </span>
      )}

      {/* Page numbers: fewer on a phone. Only one of these two lists is ever displayed. */}
      <div className="flex items-center gap-0.5 sm:hidden">{pageItems(compactPageNumbers(currentPage, totalPages))}</div>
      <div className="hidden items-center gap-1 sm:flex">{pageItems(pageNumbers(currentPage, totalPages))}</div>

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={pageHref(currentPage + 1)}
          className={`${ARROW_CLASS} font-medium text-zinc-600 hover:text-zinc-900 hover:bg-stone-100 rounded-lg transition-colors`}
          aria-label={t("nextPage")}
        >
          <span className="hidden sm:inline">{t("next")}</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span aria-hidden="true" className={`invisible ${ARROW_CLASS}`}>
          <span className="hidden sm:inline">{t("next")}</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
