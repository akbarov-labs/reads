import type { Metadata } from "next";
import { headers } from "next/headers";
import { after } from "next/server";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getAuthorBySlug, getAuthors, getBookYears, getBooks, getCategories, getPublisherBySlug, getPublishers, getTranslators } from "@/lib/api";
import { localeAlternates, type Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { MetaLine } from "@/components/MetaLine";
import { Pagination } from "@/components/Pagination";
import { BookSearchForm } from "@/components/BookSearchForm";
import { BookFilterPanel, booksHref, type BookFilterValues, type FilterOption } from "@/components/BookFilterPanel";
import { listingSearch, logSearch } from "@/lib/stats";

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

/** The publishers and authors a filter offers: the most published. A link can still name any other. */
const FILTER_OPTIONS = 100;

const SORTS = ["year", "title", "recent"] as const;
type Sort = (typeof SORTS)[number];

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
    translator?: string;
    series?: string;
    year?: string;
    sort?: string;
  }>;
}) {
  const { locale } = await params;
  const raw = await searchParams;
  // An empty select submits "year=": the same as no filter.
  const clean = (value?: string) => (value && value.trim() ? value.trim() : undefined);
  const q = clean(raw.q);
  const category = clean(raw.category);
  const author = clean(raw.author);
  const publisher = clean(raw.publisher);
  const translator = clean(raw.translator);
  const series = clean(raw.series);
  const year = /^\d{4}$/.test(raw.year ?? "") ? raw.year : undefined;
  const sort = SORTS.includes(raw.sort as Sort) ? (raw.sort as Sort) : undefined;
  setRequestLocale(locale);

  const currentPage = Math.max(1, parseInt(raw.page ?? "1", 10) || 1);
  const filters = { q, category, author, publisher, translator, series };

  // The API pages the catalogue; this page asks for exactly the slice it
  // shows. The filter's choices are the most published publishers and
  // authors, every translator, and the years this very list was printed in.
  const [books, categories, years, publisherList, authorList, translatorList, t, tCard] = await Promise.all([
    getBooks(locale, { page: currentPage, perPage: PER_PAGE, ...filters, year, sort }),
    getCategories(locale),
    getBookYears(locale, filters),
    getPublishers(locale, { perPage: FILTER_OPTIONS }),
    getAuthors(locale, { perPage: FILTER_OPTIONS }),
    getTranslators(locale),
    getTranslations("books"),
    getTranslations("bookCard"),
  ]);

  const publishers: FilterOption[] = publisherList.items.map((p) => ({ slug: p.slug, name: p.name, count: p.bookCount }));
  const authors: FilterOption[] = authorList.items.map((a) => ({ slug: a.slug, name: a.name, count: a.bookCount }));
  const translators: FilterOption[] = translatorList
    .map((tr) => ({ slug: tr.slug, name: tr.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // A publisher or author reached by a link, beyond the first hundred:
  // fetched by name so its chip and option read properly.
  const [extraPublisher, extraAuthor] = await Promise.all([
    publisher && !publishers.some((p) => p.slug === publisher) ? getPublisherBySlug(publisher, locale) : null,
    author && !authors.some((a) => a.slug === author) ? getAuthorBySlug(author, locale) : null,
  ]);
  if (extraPublisher) publishers.unshift({ slug: extraPublisher.slug, name: extraPublisher.name });
  if (extraAuthor) authors.unshift({ slug: extraAuthor.slug, name: extraAuthor.name });

  const values = { ...filters, year, sort };

  // The filter form sends every select, chosen or not ("author=&sort="):
  // move to the same list's tidy address, which is also the one to share.
  if (Object.values(raw).some((value) => value === "")) {
    const page = currentPage > 1 ? String(currentPage) : undefined;
    redirect({ href: booksHref({ ...values, ...(page ? { page } : {}) } as BookFilterValues), locale });
  }

  // For the site's statistics: what readers search for, and what found nothing.
  const search = listingSearch(
    { q, page: currentPage, filters: [category, author, publisher, translator, series, year] },
    books.total,
    locale,
    await headers(),
  );
  if (search) after(() => logSearch(search));

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

            <BookSearchForm defaultValue={q ?? ""} hidden={{ category, year, publisher, author, translator, sort }} className="mt-6 max-w-xl" />

            {categories.length > 0 && (
              <nav className="mt-5 flex flex-wrap gap-2" aria-label={t("categories")}>
                <Link
                  href={booksHref({ ...values, category: undefined })}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    !category
                      ? "border-forest-700 bg-forest-700 text-white"
                      : "border-stone-300 text-zinc-600 hover:border-forest-400"
                  }`}
                >
                  {t("allCategories")}
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={booksHref({ ...values, category: c.slug })}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      category === c.slug
                        ? "border-forest-700 bg-forest-700 text-white"
                        : "border-stone-300 text-zinc-600 hover:border-forest-400"
                    }`}
                  >
                    {c.name}
                  </Link>
                ))}
              </nav>
            )}

            <BookFilterPanel
              values={values}
              years={years}
              publishers={publishers}
              authors={authors}
              translators={translators}
              labels={{
                filters: t("filters"),
                year: t("filterYear"),
                allYears: t("allYears"),
                publisher: t("filterPublisher"),
                allPublishers: t("allPublishers"),
                author: t("filterAuthor"),
                allAuthors: t("allAuthors"),
                translator: t("filterTranslator"),
                allTranslators: t("allTranslators"),
                sort: t("sort"),
                sortRelevance: t("sortRelevance"),
                sortYear: t("sortYear"),
                sortTitle: t("sortTitle"),
                sortRecent: t("sortRecent"),
                apply: t("apply"),
                clear: t("clear"),
                remove: t("removeFilter", { name: "{name}" }),
              }}
            />

            <p className="mt-4 text-xs text-zinc-400">{t("count", { count: books.total })}</p>
          </div>

          {paginatedBooks.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {paginatedBooks.map((book, index) => (
                  <Link
                    key={book.id}
                    href={`/book/${book.id}`}
                    className="group block"
                  >
                    <article>
                      {/* Cover */}
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-stone-100 shadow-sm ring-1 ring-stone-200 transition-all duration-200 group-hover:shadow-md group-hover:ring-forest-300">
                        {book.coverUrl ? (
                          <Image
                            src={book.coverUrl}
                            alt={tCard("coverAlt", { title: book.uzbekTitle })}
                            fill
                            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 25vw, 50vw"
                            className="object-cover"
                            priority={index < 5}
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
                            <span className="inline-block rounded-md border bg-white/90 px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-600 shadow-sm backdrop-blur-sm border-zinc-200">
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
                        <h2 className="font-serif text-sm leading-snug text-zinc-900 group-hover:text-forest-800 transition-colors">
                          {book.uzbekTitle}
                        </h2>
                        {book.originalTitle && (
                          <p className="mt-0.5 text-[11px] italic text-zinc-500 truncate">
                            {book.originalTitle}
                          </p>
                        )}
                        {book.author && (
                          <p className="mt-1 text-[11px] uppercase tracking-wider text-zinc-400 truncate">
                            {book.author}
                          </p>
                        )}
                        {book.translatorName && (
                          <p className="mt-0.5 text-[11px] text-zinc-400">
                            {t("translatedBy")}{" "}
                            <span className="font-medium text-zinc-600">
                              {book.translatorName}
                            </span>
                          </p>
                        )}
                        <MetaLine parts={[book.publisher, book.year]} className="mt-0.5 text-[11px] text-zinc-400" />
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
              <Pagination
                currentPage={books.page}
                totalPages={books.lastPage}
                basePath="/books"
                query={{ q, category, author, publisher, translator, series, year, sort }}
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
