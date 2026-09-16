import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAuthors } from "@/lib/api";
import { localeAlternates, type Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { AuthorCard } from "@/components/AuthorCard";
import { Pagination } from "@/components/Pagination";

const PER_PAGE = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "authors" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: localeAlternates(locale as Locale, "/authors"),
  };
}

export default async function AuthorsPage({
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

  const [authors, t] = await Promise.all([
    getAuthors(locale),
    getTranslations("authors"),
  ]);

  const totalPages = Math.ceil(authors.length / PER_PAGE);
  const paginatedAuthors = authors.slice(
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

          {paginatedAuthors.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedAuthors.map((author) => (
                  <AuthorCard key={author.name} author={author} />
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath={`/${locale}/authors`}
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
