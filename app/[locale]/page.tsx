import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  getTranslators,
  getBooks,
  getAuthors,
  getPublishers,
  getTaqrizchilar,
  getCollections,
  getQuoteOfTheDay,
  getAnnouncements,
} from "@/lib/api";
import { localeAlternates, type Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { siteGraph } from "@/lib/jsonld";
import { Container } from "@/components/Container";
import { SectionHeader } from "@/components/SectionHeader";
import { TaqrizchiCard } from "@/components/TaqrizchiCard";
import { TranslatorCard } from "@/components/TranslatorCard";
import { BookCard } from "@/components/BookCard";
import { AuthorCard } from "@/components/AuthorCard";
import { PublisherCard } from "@/components/PublisherCard";
import { CollectionCard } from "@/components/CollectionCard";
import { QuoteBlock } from "@/components/QuoteBlock";
import { AnnouncementsSection } from "@/components/AnnouncementsSection";
import { stillOpen } from "@/lib/announcements";
import { BookSearchForm } from "@/components/BookSearchForm";
import { getPathname } from "@/i18n/navigation";

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

  // The layout 404s an unknown locale too, but pages render alongside it,
  // so without this /favicon.ico (read as locale "favicon.ico") would still
  // fire every homepage API call first — and log an error for each.
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  // Only the few rows each section shows; the totals come from the API's
  // pagination meta rather than from counting a downloaded catalogue.
  const [translators, books, authors, publishers, taqrizchilar, quote, collections, announcements, t, tTaqrizchilar, tSite, tCollections, tQuotes] =
    await Promise.all([
    getTranslators(locale),
    getBooks(locale, { perPage: 8 }),
    getAuthors(locale, { perPage: 6 }),
    getPublishers(locale, { perPage: 4 }),
    getTaqrizchilar(locale),
    getQuoteOfTheDay(locale),
    getCollections(locale),
    getAnnouncements(locale, { limit: 6 }),
    getTranslations("home"),
    getTranslations("taqrizchilar"),
    getTranslations("site"),
    getTranslations("collections"),
    getTranslations("quotes"),
  ]);

  const featuredTranslators = translators.slice(0, 4);
  const featuredBooks = books.items;
  const featuredAuthors = authors.items;
  const featuredPublishers = publishers.items;
  const featuredTaqrizchilar = taqrizchilar.slice(0, 3);

  // Global hero stats
  const stats = [
    { label: t("statBooks"), value: books.total },
    { label: t("statAuthors"), value: authors.total },
    { label: t("statTranslators"), value: translators.length },
    { label: t("statPublishers"), value: publishers.total },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <JsonLd
        data={siteGraph({
          locale: locale as Locale,
          name: tSite("homeTitle"),
          description: tSite("homeDescription"),
        })}
      />
      <SiteHeader />

      <main className="flex-1">
        {/* ─── HERO ─────────────────────────────────────────────── */}
        {/* No overflow-hidden: the search box's suggestions hang below it. */}
        <section className="relative border-b border-stone-200 bg-stone-50">
          <Container className="relative py-20 sm:py-28">
            <div className="max-w-2xl">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-zinc-900 leading-[1.1] tracking-tight whitespace-pre-line">
                {t("heroHeadline")}
              </h1>
              <p className="mt-6 text-base sm:text-lg text-zinc-500 leading-relaxed max-w-xl">
                {t("heroSubline")}
              </p>
              {/* Most readers come for one book: let them look it up first. */}
              <BookSearchForm
                action={getPathname({ href: "/books", locale })}
                large
                className="mt-8 max-w-xl"
              />
            </div>

            {/* Stats row */}
            <dl className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-px bg-stone-200 rounded-2xl overflow-hidden border border-stone-200">
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

        {/* ─── QUOTE OF THE DAY ─────────────────────────────────── */}
        {quote?.book && (
          <section className="py-14 sm:py-16 bg-white border-b border-stone-200" aria-labelledby="quote-of-the-day">
            <Container>
              <div className="max-w-3xl">
                <h2 id="quote-of-the-day" className="text-xs font-medium uppercase tracking-widest2 text-zinc-400 mb-5">
                  {tQuotes("quoteOfTheDay")}
                </h2>
                <QuoteBlock
                  quote={quote}
                  bookId={quote.book.id}
                  author={quote.book.author}
                  book={quote.book.uzbekTitle}
                  large
                />
              </div>
            </Container>
          </section>
        )}

        {/* ─── NEW BOOKS AND PRE-ORDERS ─── from publishers' Telegram
            channels; absent when there are none. */}
        {stillOpen(announcements).length > 0 && (
          <div className="py-16 sm:py-20 border-b border-stone-200">
            <Container>
              <AnnouncementsSection announcements={announcements} locale={locale} />
            </Container>
          </div>
        )}

        {/* ─── BOOKS ───────────────────────────────────────────── */}
        <section className="py-16 sm:py-20 bg-white border-b border-stone-200">
          <Container>
            <SectionHeader
              title={t("booksTitle")}
              count={books.total}
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

        {/* ─── COLLECTIONS ─── editors' lists; absent until there are any. */}
        {collections.length > 0 && (
          <section className="py-16 sm:py-20 border-b border-stone-200">
            <Container>
              <SectionHeader
                title={tCollections("homeTitle")}
                count={collections.length}
                seeMoreHref="/collections"
                seeMoreLabel={tCollections("seeAll")}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {collections.slice(0, 3).map((collection) => (
                  <CollectionCard key={collection.slug} collection={collection} />
                ))}
              </div>
            </Container>
          </section>
        )}

        {/* ─── AUTHORS ─────────────────────────────────────────── */}
        <section className="py-16 sm:py-20">
          <Container>
            <SectionHeader
              title={t("authorsTitle")}
              count={authors.total}
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

        {/* ─── TRANSLATORS ─────────────────────────────────────── */}
        <section className="py-16 sm:py-20 bg-white border-y border-stone-200">
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

        {/* ─── TAQRIZCHILAR ────────────────────────────────────── */}
        {taqrizchilar.length > 0 && (
          <section className="py-16 sm:py-20">
            <Container>
              <SectionHeader
                title={tTaqrizchilar("sectionTitle")}
                count={taqrizchilar.length}
                seeMoreHref="/taqrizchilar"
                seeMoreLabel={tTaqrizchilar("seeAll")}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredTaqrizchilar.map((taqrizchi) => (
                  <TaqrizchiCard
                    key={taqrizchi.slug}
                    taqrizchi={taqrizchi}
                    countLabel={tTaqrizchilar("taqrizlar", {
                      count: taqrizchi.totalTaqrizlar,
                    })}
                    viewLabel={tTaqrizchilar("viewProfile")}
                  />
                ))}
              </div>
            </Container>
          </section>
        )}

        {/* ─── PUBLISHERS ──────────────────────────────────────── */}
        <section className="py-16 sm:py-20 bg-white border-t border-stone-200">
          <Container>
            <SectionHeader
              title={t("publishersTitle")}
              count={publishers.total}
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
    </div>
  );
}
