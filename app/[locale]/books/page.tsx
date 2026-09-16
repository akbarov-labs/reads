import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAllBooks } from "@/lib/api";
import { localeAlternates, type Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { Pagination } from "@/components/Pagination";

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
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));

  const [allBooks, t, tCard] = await Promise.all([
    getAllBooks(locale),
    getTranslations("books"),
    getTranslations("bookCard"),
  ]);

  const totalPages = Math.ceil(allBooks.length / PER_PAGE);
  const paginatedBooks = allBooks.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

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
                        {/* Role badge */}
                        <div className="absolute top-2 left-2">
                          <span className="inline-block rounded-md border bg-white/90 px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-600 shadow-xs backdrop-blur-xs border-zinc-200">
                            {book.role === "author"
                              ? tCard("roleAuthor")
                              : book.role === "editor"
                              ? tCard("roleEditor")
                              : tCard("roleTranslator")}
                          </span>
                        </div>
                      </div>
                      {/* Meta */}
                      <div className="mt-3">
                        <h2 className="font-serif text-sm leading-snug text-zinc-900 group-hover:text-amber-800 transition-colors">
                          {book.uzbekTitle}
                        </h2>
                        <p className="mt-0.5 text-[11px] italic text-zinc-500 truncate">
                          {book.originalTitle}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-wider text-zinc-400 truncate">
                          {book.author}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-400">
                          {t("translatedBy")}{" "}
                          <span className="font-medium text-zinc-600">
                            {book.translatorName}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-400">
                          {book.publisher} · {book.year}
                        </p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath={`/${locale}/books`}
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
