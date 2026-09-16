import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getTranslators, getAllBooks, getAuthors, getPublishers } from "@/lib/api";
import { localeAlternates, type Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { SectionHeader } from "@/components/SectionHeader";
import { TranslatorCard } from "@/components/TranslatorCard";
import { BookCard } from "@/components/BookCard";
import { AuthorCard } from "@/components/AuthorCard";
import { PublisherCard } from "@/components/PublisherCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
    alternates: localeAlternates(locale as Locale),
  };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [translators, allBooks, authors, publishers, t] = await Promise.all([
    getTranslators(locale),
    getAllBooks(locale),
    getAuthors(locale),
    getPublishers(locale),
    getTranslations("home"),
  ]);

  const featuredTranslators = translators.slice(0, 4);
  const featuredBooks = allBooks.slice(0, 8);
  const featuredAuthors = authors.slice(0, 6);
  const featuredPublishers = publishers.slice(0, 4);

  // Global hero stats
  const stats = [
    { label: t("statTranslators"), value: translators.length },
    { label: t("statBooks"), value: allBooks.length },
    { label: t("statAuthors"), value: authors.length },
    { label: t("statPublishers"), value: publishers.length },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <SiteHeader />

      <main className="flex-1">
        {/* ─── HERO ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-stone-200 bg-white">
          {/* Subtle warm gradient */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(217,119,6,0.07),transparent)]"
          />
          <Container className="relative py-20 sm:py-28">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest2 text-amber-700 mb-5">
                Reads
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-zinc-900 leading-[1.1] tracking-tight whitespace-pre-line">
                {t("heroHeadline")}
              </h1>
              <p className="mt-6 text-base sm:text-lg text-zinc-500 leading-relaxed max-w-xl">
                {t("heroSubline")}
              </p>
            </div>

            {/* Stats row */}
            <dl className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-px bg-stone-200 rounded-2xl overflow-hidden shadow-sm border border-stone-200">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white px-6 py-6 text-center"
                >
                  <dt className="text-xs font-medium uppercase tracking-widest2 text-zinc-400 mb-1">
                    {stat.label}
                  </dt>
                  <dd className="font-serif text-4xl text-zinc-900">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Container>
        </section>

        {/* ─── TRANSLATORS ─────────────────────────────────────── */}
        <section className="py-16 sm:py-20">
          <Container>
            <SectionHeader
              title={t("translatorsTitle")}
              count={translators.length}
              seeMoreHref="/translators"
              seeMoreLabel={t("translatorsSeeAll")}
            />
            {featuredTranslators.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {featuredTranslators.map((translator) => (
                  <TranslatorCard key={translator.slug} translator={translator} />
                ))}
              </div>
            ) : (
              <p className="text-zinc-400 text-sm">{t("empty")}</p>
            )}
          </Container>
        </section>

        {/* ─── BOOKS ───────────────────────────────────────────── */}
        <section className="py-16 sm:py-20 bg-white border-y border-stone-200">
          <Container>
            <SectionHeader
              title={t("booksTitle")}
              count={allBooks.length}
              seeMoreHref="/books"
              seeMoreLabel={t("booksSeeAll")}
            />
            {featuredBooks.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-4 lg:grid-cols-8">
                {featuredBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <p className="text-zinc-400 text-sm">{t("empty")}</p>
            )}
          </Container>
        </section>

        {/* ─── AUTHORS ─────────────────────────────────────────── */}
        <section className="py-16 sm:py-20">
          <Container>
            <SectionHeader
              title={t("authorsTitle")}
              count={authors.length}
              seeMoreHref="/authors"
              seeMoreLabel={t("authorsSeeAll")}
            />
            {featuredAuthors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredAuthors.map((author) => (
                  <AuthorCard key={author.name} author={author} />
                ))}
              </div>
            ) : (
              <p className="text-zinc-400 text-sm">{t("empty")}</p>
            )}
          </Container>
        </section>

        {/* ─── PUBLISHERS ──────────────────────────────────────── */}
        <section className="py-16 sm:py-20 bg-white border-t border-stone-200">
          <Container>
            <SectionHeader
              title={t("publishersTitle")}
              count={publishers.length}
              seeMoreHref="/publishers"
              seeMoreLabel={t("publishersSeeAll")}
            />
            {featuredPublishers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {featuredPublishers.map((publisher) => (
                  <PublisherCard key={publisher.name} publisher={publisher} />
                ))}
              </div>
            ) : (
              <p className="text-zinc-400 text-sm">{t("empty")}</p>
            )}
          </Container>
        </section>
      </main>

      {/* ─── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-stone-200 py-10 text-center text-xs text-zinc-400 bg-stone-50">
        <Container>
          <p className="font-serif italic text-sm text-zinc-600 mb-1">
            «{getFooterQuote(locale)}»
          </p>
          <p>© {new Date().getFullYear()} Reads.</p>
        </Container>
      </footer>
    </div>
  );
}

/** Inline footer quote since it's static per locale — avoids an extra getTranslations call. */
function getFooterQuote(locale: string): string {
  const quotes: Record<string, string> = {
    uz: "Adabiyot, inson qalbining eng chuqur aks-sadosidir.",
    ru: "Литература — самое глубокое эхо человеческой души.",
    en: "Literature is the deepest echo of the human soul.",
  };
  return quotes[locale] ?? quotes.en;
}
