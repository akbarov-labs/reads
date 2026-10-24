import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getBooks, getPublisherBySlug } from "@/lib/api";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { publisherPageGraph } from "@/lib/jsonld";
import { localeAlternates, type Locale } from "@/lib/site";
import { Container } from "@/components/Container";
import { ArrowLeft, ArrowRight, BookOpen, Building2 } from "lucide-react";

type PageParams = { locale: string; slug: string };

/** Enough for most publishers; the rest are a link to /books?publisher=. */
const BOOKS_SHOWN = 48;

function publisherColor(name: string): string {
  // One accent: every placeholder is the same quiet brand tint.
  const colors = ["from-forest-50 to-forest-100 text-forest-800"];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export async function generateStaticParams(): Promise<PageParams[]> {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const [publisher, t] = await Promise.all([
    getPublisherBySlug(slug, locale),
    getTranslations({ locale, namespace: "publisherDetail" }),
  ]);
  if (!publisher) return { robots: { index: false, follow: false } };

  const title = t("metaTitle", { name: publisher.name });
  const description = t("metaDescription", { name: publisher.name });
  // Its own address in each language; otherwise it inherits the home page's.
  const alternates = localeAlternates(locale as Locale, `/publisher/${slug}`);
  return {
    title,
    description,
    alternates,
    openGraph: { type: "profile", title, description, url: alternates.canonical },
  };
}

export default async function PublisherDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [publisher, books, tPublisher, tBookCard, tBooks] = await Promise.all([
    getPublisherBySlug(slug, locale),
    getBooks(locale, { publisher: slug, perPage: BOOKS_SHOWN }),
    getTranslations("publisherDetail"),
    getTranslations("bookCard"),
    getTranslations("books"),
  ]);

  if (!publisher) notFound();

  const publisherBooks = books.items;

  // Deduplicate authors and translators
  const authorsSet = new Set<string>();
  const translatorsMap = new Map<string, { slug: string; name: string }>();

  for (const b of publisherBooks) {
    if (b.author) authorsSet.add(b.author);
    if (b.translatorSlug && b.translatorName && !translatorsMap.has(b.translatorSlug)) {
      translatorsMap.set(b.translatorSlug, {
        slug: b.translatorSlug,
        name: b.translatorName,
      });
    }
  }

  const authors = Array.from(authorsSet);
  const translators = Array.from(translatorsMap.values());
  const gradientClass = publisherColor(publisher.name);

  return (
    <>
      <JsonLd
        data={publisherPageGraph({
          publisher,
          locale: locale as Locale,
          path: `/publisher/${slug}`,
          trail: [
            { name: "Kitoblarim", path: "" },
            { name: tPublisher("breadcrumbPublishers"), path: "/publishers" },
            { name: publisher.name, path: `/publisher/${slug}` },
          ],
        })}
      />
      <SiteHeader />
      <main className="py-10 sm:py-14">
        <Container>
          {/* Breadcrumbs & Back */}
          <div className="mb-8 flex items-center justify-between">
            <Link
              href="/publishers"
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{tPublisher("back")}</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
              <Link href="/" className="hover:text-zinc-600 transition-colors">
                Kitoblarim
              </Link>
              <span>/</span>
              <Link href="/publishers" className="hover:text-zinc-600 transition-colors">
                {tPublisher("breadcrumbPublishers")}
              </Link>
              <span>/</span>
              <span className="text-zinc-700 truncate max-w-xs">{publisher.name}</span>
            </nav>
          </div>

          {/* Publisher Header */}
          <div className="rounded-2xl border border-stone-200 overflow-hidden bg-white shadow-sm">
            <div className={`p-8 sm:p-10 bg-gradient-to-r ${gradientClass}`}>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                {publisher.imageUrl ? (
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden bg-white shadow-md border-2 border-white/80 shrink-0">
                    <Image
                      src={publisher.imageUrl}
                      alt={publisher.name}
                      fill
                      priority
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white/80 shadow-md border-2 border-white/80 flex items-center justify-center shrink-0">
                    <Building2 className="h-10 w-10 text-zinc-600" />
                  </div>
                )}

                <div className="flex-1">
                  <h1 className="font-serif text-3xl sm:text-4xl text-zinc-900 font-semibold">
                    {publisher.name}
                  </h1>

                  <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 shadow-sm px-3.5 py-1 text-xs font-medium text-zinc-800">
                      <BookOpen className="h-3.5 w-3.5 text-zinc-500" />
                      {tPublisher("totalBooks", { count: publisher.bookCount })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Catalog */}
          <section className="mt-12 sm:mt-16">
            <div className="mb-8">
              <h2 className="font-serif text-2xl sm:text-3xl text-zinc-900 font-semibold">
                {tPublisher("catalog")}
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
              {publisherBooks.map((book) => (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  className="group flex flex-col"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-100 shadow-sm ring-1 ring-zinc-200 transition-all duration-200 group-hover:shadow-md group-hover:ring-forest-300">
                    {book.coverUrl ? (
                      <Image
                        src={book.coverUrl}
                        alt={book.uzbekTitle}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-4">
                        <span className="font-serif text-center text-sm text-stone-400">{book.uzbekTitle}</span>
                      </div>
                    )}
                    {book.role && (
                      <div className="absolute top-2.5 left-2.5">
                        <span className="inline-block rounded-md border border-white/40 bg-white/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-800 shadow-sm">
                          {book.role === "author"
                            ? tBookCard("roleAuthor")
                            : book.role === "editor"
                            ? tBookCard("roleEditor")
                            : tBookCard("roleTranslator")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3.5">
                    <h3 className="font-serif text-base sm:text-lg text-zinc-900 font-medium group-hover:text-forest-800 transition-colors leading-snug">
                      {book.uzbekTitle}
                    </h3>
                    <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">
                      {book.author}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {[book.translatorName ? tPublisher("bookTranslator", { name: book.translatorName }) : null, book.year]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {books.total > publisherBooks.length && (
              <div className="mt-10 text-center">
                <Link
                  href={`/books?publisher=${publisher.slug}`}
                  className="inline-block rounded-lg border border-stone-300 px-4 py-2 text-sm text-zinc-700 hover:border-forest-400 hover:text-forest-800"
                >
                  {tBooks("count", { count: books.total })}
                  <ArrowRight aria-hidden="true" className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
                </Link>
              </div>
            )}
          </section>

          {/* Collaborating Translators & Authors */}
          <section className="mt-16 sm:mt-20 border-t border-stone-200 pt-12">
            <h2 className="font-serif text-2xl text-zinc-900 mb-6">
              {tPublisher("translatorsAndAuthors")}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Translators */}
              {translators.length > 0 && (
                <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-6">
                  <h3 className="font-serif text-lg font-medium text-zinc-900 mb-4">
                    {tPublisher("translators")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {translators.map((t) => (
                      <Link
                        key={t.slug}
                        href={`/translator/${t.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3.5 py-1.5 text-xs text-zinc-700 hover:border-forest-300 hover:text-forest-800 transition-colors"
                      >
                        {t.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Authors */}
              {authors.length > 0 && (
                <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-6">
                  <h3 className="font-serif text-lg font-medium text-zinc-900 mb-4">
                    {tPublisher("authors")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {authors.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center rounded-full bg-white border border-stone-200 px-3.5 py-1.5 text-xs text-zinc-700"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </Container>
      </main>
    </>
  );
}
