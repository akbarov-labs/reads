import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getBooks, getCategories } from "@/lib/api";
import { localeAlternates, type Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { Pagination } from "@/components/Pagination";

/**
 * These listing pages read `page` out of searchParams, which is a dynamic
 * server API. The [locale] layout has generateStaticParams, so without this
 * Next treats them as statically prerenderable, then throws
 * DYNAMIC_SERVER_USAGE at request time when searchParams is touched — a 500
 * on every listing page while the home page and detail pages, which take no
 * search params, carry on working.
 *
 * The data itself is still cached: apiFetch tags its fetches and revalidates
 * on the admin webhook, so this costs a re-render, not a round trip.
 */
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "books" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: localeAlternates(locale as Locale, "/books"),
  };
}

export default async function BooksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    q?: string;
    category?: string;
    author?: string;
    publisher?: string;
    series?: string;
  }>;
}) {
  const { locale } = await params;
  const { page: pageParam, q, category, author, publisher, series } = await searchParams;
  setRequestLocale(locale);

  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  // The API pages the catalogue; this page asks for exactly the slice it shows.
  const [books, categories, t, tCard] = await Promise.all([
    getBooks(locale, { page: currentPage, perPage: PER_PAGE, q, category, author, publisher, series }),
    getCategories(locale),
    getTranslations("books"),
    getTranslations("bookCard"),
  ]);

  const paginatedBooks = books.items;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <SiteHeader />
      <main className="flex-1">
        <Container className="py-12 sm:py-16">
          <div className="mb-10 pb-6 border-b border-stone-200">
            <h1 className="font-serif text-3xl sm:text-4xl text-zinc-900 tracking-tight">
              {t("pageTitle")}
            </h1>
            <p className="mt-2 text-zinc-500 text-sm">{t("pageDescription")}</p>

            {/* A plain GET form: works without JavaScript, and the query
                lands in the URL, so a search can be shared and paged. */}
            <form action="" method="get" className="mt-6 flex gap-2 max-w-xl">
              {category && <input type="hidden" name="category" value={category} />}
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder={t("searchPlaceholder")}
                className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
              >
                {t("search")}
              </button>
            </form>

            {categories.length > 0 && (
              <nav className="mt-5 flex flex-wrap gap-2" aria-label={t("categories")}>
                <Link
                  href={q ? `/books?q=${encodeURIComponent(q)}` : "/books"}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    !category
                      ? "border-amber-700 bg-amber-700 text-white"
                      : "border-stone-300 text-zinc-600 hover:border-amber-400"
                  }`}
                >
                  {t("allCategories")}
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/books?${new URLSearchParams({ ...(q ? { q } : {}), category: c.slug })}`}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      category === c.slug
                        ? "border-amber-700 bg-amber-700 text-white"
                        : "border-stone-300 text-zinc-600 hover:border-amber-400"
                    }`}
                  >
                    {c.name}
                  </Link>
                ))}
              </nav>
            )}

            <p className="mt-4 text-xs text-zinc-400">{t("count", { count: books.total })}</p>
          </div>

          {paginatedBooks.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {paginatedBooks.map((book) => (
                  <Link
                    key={book.id}
                    href={`/book/${book.id}`}
                    className="group block"
                  >
                    <article>
                      {/* Cover */}
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-stone-100 shadow-sm ring-1 ring-stone-200 transition-all duration-200 group-hover:shadow-md group-hover:ring-amber-300">
                        {book.coverUrl ? (
                          <Image
                            src={book.coverUrl}
                            alt={tCard("coverAlt", { title: book.uzbekTitle })}
                            fill
                            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 25vw, 50vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center p-4">
                            <span className="font-serif text-center text-sm text-stone-400 leading-snug">
                              {book.uzbekTitle}
                            </span>
                          </div>
                        )}
                        {/* Role badge — only when someone is credited */}
                        {book.role && (
                          <div className="absolute top-2 left-2">
                            <span className="inline-block rounded-md border bg-white/90 px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-600 shadow-xs backdrop-blur-xs border-zinc-200">
                              {book.role === "author"
                                ? tCard("roleAuthor")
                                : book.role === "editor"
                                ? tCard("roleEditor")
                                : tCard("roleTranslator")}
                            </span>
                          </div>
                        )}
                        {(book.editionCount ?? 1) > 1 && (
                          <div className="absolute bottom-2 right-2">
                            <span className="inline-block rounded-md bg-zinc-900/75 px-2 py-0.5 text-[10px] font-medium text-white">
                              {t("editions", { count: book.editionCount ?? 1 })}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Meta */}
                      <div className="mt-3">
                        <h2 className="font-serif text-sm leading-snug text-zinc-900 group-hover:text-amber-800 transition-colors">
                          {book.uzbekTitle}
                        </h2>
                        {book.originalTitle && (
                          <p className="mt-0.5 text-[11px] italic text-zinc-500 truncate">
                            {book.originalTitle}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] uppercase tracking-wider text-zinc-400 truncate">
                          {book.author}
                        </p>
                        {book.translatorName && (
                          <p className="mt-0.5 text-[11px] text-zinc-400">
                            {t("translatedBy")}{" "}
                            <span className="font-medium text-zinc-600">
                              {book.translatorName}
                            </span>
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-zinc-400">
                          {[book.publisher, book.year].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
              <Pagination
                currentPage={books.page}
                totalPages={books.lastPage}
                basePath="/books"
                query={{ q, category, author, publisher, series }}
              />
            </>
          ) : (
            <p className="text-zinc-400">{t("empty")}</p>
          )}
        </Container>
      </main>
    </div>
  );
}
