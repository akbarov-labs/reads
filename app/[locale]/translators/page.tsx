import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getTranslators } from "@/lib/api";
import { localeAlternates, type Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { TranslatorCard } from "@/components/TranslatorCard";
import { Pagination } from "@/components/Pagination";

const PER_PAGE = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "translators" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: localeAlternates(locale as Locale, "/translators"),
  };
}

export default async function TranslatorsPage({
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

  const [translators, t] = await Promise.all([
    getTranslators(locale),
    getTranslations("translators"),
  ]);

  const totalPages = Math.ceil(translators.length / PER_PAGE);
  const paginatedTranslators = translators.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <SiteHeader />
      <main className="flex-1">
        <Container className="py-12 sm:py-16">
          {/* Page header */}
          <div className="mb-10 pb-6 border-b border-stone-200">
            <h1 className="font-serif text-3xl sm:text-4xl text-zinc-900 tracking-tight">
              {t("pageTitle")}
            </h1>
            <p className="mt-2 text-zinc-500 text-sm">{t("pageDescription")}</p>
          </div>

          {paginatedTranslators.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedTranslators.map((translator) => (
                  <TranslatorCard key={translator.slug} translator={translator} />
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath={`/${locale}/translators`}
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
