import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getBookById, publicAssetUrl } from "@/lib/api";
import type { BookWithTranslator, Edition } from "@/lib/types";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Bookmark, User } from "lucide-react";
import { TaqrizCard } from "@/components/TaqrizCard";
import { ShareLinks } from "@/components/ShareLinks";
import { taqrizShareText } from "@/lib/share";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ReaderReviews } from "@/components/ReaderReviews";
import { QuoteBlock } from "@/components/QuoteBlock";
import { ReaderCounts } from "@/components/ReaderCounts";
import { botPlanUrl, botReviewUrl, botWantUrl } from "@/lib/bot";
import { storeLinks, storeRedirectPath } from "@/lib/stores";
import { JsonLd } from "@/components/JsonLd";
import { bookPageGraph } from "@/lib/jsonld";
import { localeAlternates, type Locale } from "@/lib/site";
import { bookDescription, bookPages, bookSeoTitle, bookTitle, readingTime } from "@/lib/seo";
import { BrandMark } from "@/components/BrandMark";
import { BookViewBeacon } from "@/components/BookViewBeacon";

type PageParams = { locale: string; id: string };

export async function generateStaticParams(): Promise<PageParams[]> {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const [book, t] = await Promise.all([
    getBookById(id, locale),
    getTranslations({ locale, namespace: "bookDetail" }),
  ]);
  if (!book) return { robots: { index: false, follow: false } };

  const title = bookTitle(book);
  const description = bookDescription(book, t);
  const cover = publicAssetUrl(book.coverUrl);

  return {
    title: bookSeoTitle(book, t),
    description,
    // Its own address, and its own in each language. Without this the page
    // inherits the layout's, which points at the home page and tells search
    // engines every book is a copy of it.
    alternates: localeAlternates(locale as Locale, `/book/${id}`),
    openGraph: {
      type: "book",
      title,
      description,
      url: localeAlternates(locale as Locale, `/book/${id}`).canonical,
      ...(cover ? { images: [{ url: cover, alt: book.uzbekTitle }] } : {}),
      isbn: (book.editions ?? []).find((edition) => edition.isbn)?.isbn ?? undefined,
    },
  };
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [book, tDetail, tCard, tTaqriz, tQuotes] = await Promise.all([
    getBookById(id, locale),
    getTranslations("bookDetail"),
    getTranslations("bookCard"),
    getTranslations("taqriz"),
    getTranslations("quotes"),
  ]);

  if (!book) notFound();

  const firstAuthor = book.authors?.[0];

  const roleLabel =
    book.role === "author"
      ? tCard("roleAuthor")
      : book.role === "editor"
      ? tCard("roleEditor")
      : book.role === "translator"
      ? tCard("roleTranslator")
      : null;

  // What to read next comes from the API, strongest signal first (the
  // source catalogue's own recommendations, the series, the author, the
  // genre) — the page no longer loads the whole catalogue to work it out.
  const relatedBooks = book.relatedBooks ?? [];
  const editions = book.editions ?? [];
  // The bot finds the book by ISBN; any printing with one will do.
  const isbn = editions.find((edition) => edition.isbn)?.isbn;
  const botHref = botPlanUrl(isbn);
  const wantHref = botWantUrl(isbn);
  const pages = bookPages(book);

  return (
    <>
      <JsonLd
        data={bookPageGraph({
          book,
          locale: locale as Locale,
          path: `/book/${id}`,
          description: bookDescription(book, tDetail),
          trail: [
            { name: "Kitoblarim", path: "" },
            { name: tDetail("breadcrumbBooks"), path: "/books" },
            { name: book.uzbekTitle, path: `/book/${id}` },
          ],
        })}
      />
      <SiteHeader />
      <main className="py-10 sm:py-14">
        <Container>
          {/* Breadcrumbs & Back */}
          <div className="mb-8 flex items-center justify-between">
            <Link
              href="/books"
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{tDetail("back")}</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
              <Link href="/" className="hover:text-zinc-600 transition-colors">
                Kitoblarim
              </Link>
              <span>/</span>
              <Link href="/books" className="hover:text-zinc-600 transition-colors">
                {tDetail("breadcrumbBooks")}
              </Link>
              <span>/</span>
              <span className="text-zinc-700 truncate max-w-xs">{book.uzbekTitle}</span>
            </nav>
          </div>

          {/* Book Hero Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            {/* Left: Book Cover */}
            <div className="lg:col-span-5 flex flex-col items-center lg:items-start">
              <div className="relative aspect-[2/3] w-full max-w-sm overflow-hidden rounded-xl bg-zinc-100 shadow-xl ring-1 ring-zinc-900/10">
                {book.coverUrl ? (
                  <Image
                    src={book.coverUrl}
                    alt={book.uzbekTitle}
                    fill
                    priority
                    sizes="(min-width: 1024px) 380px, 320px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-stone-200">
                    <BookOpen className="h-16 w-16 text-stone-400" />
                  </div>
                )}
                {roleLabel && (
                  <div className="absolute top-4 left-4">
                    <span className="inline-block rounded-md border border-white/40 bg-white/90 backdrop-blur-md px-3 py-1 text-xs font-medium tracking-wide text-zinc-800 shadow-sm">
                      {roleLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Book Details */}
            <div className="lg:col-span-7 flex flex-col">
              <h1 className="font-serif text-3xl sm:text-4xl text-zinc-900 font-semibold tracking-tight">
                {book.uzbekTitle}
              </h1>
              {book.originalTitle && (
                <p className="mt-2 font-serif text-lg sm:text-xl italic text-zinc-500">
                  {book.originalTitle}
                </p>
              )}

              {book.series && (
                <p className="mt-3 text-sm text-zinc-500">
                  {tDetail("series")}:{" "}
                  <Link
                    href={`/books?series=${book.series.slug}`}
                    className="text-forest-800 hover:underline underline-offset-4"
                  >
                    {book.series.position
                      ? tDetail("seriesPart", { name: book.series.name, position: book.series.position })
                      : book.series.name}
                  </Link>
                </p>
              )}

              {book.categories && book.categories.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2" aria-label={tDetail("categories")}>
                  {book.categories.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/books?category=${category.slug}`}
                      className="rounded-full border border-stone-300 px-3 py-1 text-xs text-zinc-600 hover:border-forest-400 hover:text-forest-800 transition-colors"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              )}

              {book.description && (
                <p className="mt-6 text-sm leading-relaxed text-zinc-700 whitespace-pre-line">
                  {book.description}
                </p>
              )}

              {/* Author, Translator, Publisher Cards */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Author Card */}
                <Link
                  href={firstAuthor ? `/author/${firstAuthor.slug}` : "/authors"}
                  className="group flex items-center gap-3.5 rounded-xl border border-stone-200 p-4 bg-white hover:border-forest-300 hover:shadow-sm transition-all"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-stone-200 bg-forest-50 flex items-center justify-center text-forest-800 font-serif font-medium">
                    {book.authorImageUrl ? (
                      <Image
                        src={book.authorImageUrl}
                        alt={book.author}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <span>{(book.author || "?").charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      {tDetail("author")}
                    </span>
                    <p className="font-serif text-base font-medium text-zinc-900 group-hover:text-forest-800 transition-colors truncate">
                      {book.author}
                    </p>
                  </div>
                </Link>

                {/* Translator Card — absent for a book nobody has translated. */}
                {book.translatorSlug && (
                <Link
                  href={`/translator/${book.translatorSlug}`}
                  className="group flex items-center gap-3.5 rounded-xl border border-stone-200 p-4 bg-white hover:border-forest-300 hover:shadow-sm transition-all"
                >
                  <div className="h-12 w-12 shrink-0 rounded-full border border-stone-200 bg-stone-100 flex items-center justify-center text-stone-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      {tDetail("translator")}
                    </span>
                    <p className="font-serif text-base font-medium text-zinc-900 group-hover:text-forest-800 transition-colors truncate">
                      {book.translatorName}
                    </p>
                  </div>
                </Link>
                )}
              </div>

              {/* Publication Specs: only the facts we have. A row of dashes
                  tells the reader nothing and makes the page look unfinished. */}
              {(book.publisher || book.year || book.sourceLanguage) && (
              <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50/70 p-6">
                <h2 className="font-serif text-lg font-medium text-zinc-900 mb-4">
                  {tDetail("details")}
                </h2>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
                  {book.publisher && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
                      {tDetail("publisher")}
                    </dt>
                    <dd className="mt-1 font-serif text-base text-zinc-900">
                      {book.publisherSlug ? (
                        <Link
                          href={`/publisher/${book.publisherSlug}`}
                          className="hover:text-forest-800 underline-offset-4 hover:underline transition-colors"
                        >
                          {book.publisher}
                        </Link>
                      ) : (
                        book.publisher
                      )}
                    </dd>
                  </div>
                  )}

                  {book.year && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
                      {tDetail("year")}
                    </dt>
                    <dd className="mt-1 font-serif text-base text-zinc-900">
                      {book.year}
                    </dd>
                  </div>
                  )}

                  {book.sourceLanguage && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
                      {tDetail("sourceLanguage")}
                    </dt>
                    <dd className="mt-1 font-serif text-base text-zinc-900">
                      {book.sourceLanguage}
                    </dd>
                  </div>
                  )}
                </dl>
              </div>
              )}

              {/* How long the book takes, the same line the search result
                  shows, right above the place to plan it. */}
              {pages ? (
                <p className="mt-6 text-sm text-zinc-600">{readingTime(pages, tDetail)}</p>
              ) : null}
              <ReaderCounts counts={book.readers} t={tDetail} className={pages ? "mt-1" : "mt-6"} />

              {/* The catalogue's hand-off: the same Kitoblarim, in Telegram,
                  where the reader plans this book and reads it to the end. */}
              <a
                href={botHref}
                target="_blank"
                rel="noopener"
                className="group mt-4 inline-flex items-center gap-2.5 rounded-xl py-2 pl-2 pr-3.5 text-sm font-medium text-forest-700 transition-colors duration-200 hover:bg-forest-100"
              >
                <BrandMark size={24} className="shrink-0" />
                <span>{tDetail("planInBot")}</span>
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
              </a>

              {/* Books here travel by Telegram: a chat asking "what should I
                  read?" is answered with a link. */}
              <ShareLinks path={`/book/${id}`} text={bookTitle(book)} className="mt-1" />
              <BookViewBeacon bookId={book.id} locale={locale} />

              {/* Many readers arrive looking for a copy. Say plainly that
                  there is none here, and where to look instead. */}
              <section className="mt-8 border-t border-stone-200 pt-6" aria-labelledby="where-to-get">
                <h2 id="where-to-get" className="font-serif text-lg text-zinc-900">
                  {tDetail("whereTitle")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{tDetail("whereLead")}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {storeLinks(book.uzbekTitle).map((store) => (
                    <li key={store.key}>
                      {/* Through /go/store, which counts the click and
                          redirects to the same search. A plain <a>, not
                          next/link: a prefetch would not be a click. */}
                      <a
                        href={storeRedirectPath(store.key, book.id, locale)}
                        target="_blank"
                        rel="nofollow noopener"
                        className="inline-flex items-center gap-1 rounded-full border border-stone-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:border-forest-400 hover:text-forest-800"
                      >
                        {store.name}
                        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
                {wantHref ? (
                  <a
                    href={wantHref}
                    target="_blank"
                    rel="noopener"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl py-2 pl-2 pr-3.5 text-sm font-medium text-forest-700 transition-colors duration-200 hover:bg-forest-100"
                  >
                    <Bookmark aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span>{tDetail("whereSave")}</span>
                  </a>
                ) : null}
              </section>
            </div>
          </div>

          {/* Excerpt Section (if available) */}
          {book.excerpt && (
            <section className="mt-16 sm:mt-20 border-t border-stone-200 pt-12 sm:pt-16">
              <div className="mb-8">
                <h2 className="font-serif text-2xl sm:text-3xl text-zinc-900">
                  {tDetail("excerptTitle")}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-stone-50/80 rounded-2xl p-6 sm:p-10 border border-stone-200">
                {/* Source text */}
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-3">
                    {tDetail("originalText")} ({book.excerpt.sourceLanguage})
                  </span>
                  <div className="prose prose-stone font-serif text-base sm:text-lg leading-relaxed text-zinc-700 whitespace-pre-wrap">
                    {book.excerpt.sourceText}
                  </div>
                </div>

                {/* Translated text */}
                <div className="flex flex-col border-t md:border-t-0 md:border-l border-stone-200 pt-6 md:pt-0 md:pl-8">
                  <span className="text-xs uppercase tracking-wider text-forest-800 font-semibold mb-3">
                    {tDetail("translatedText")} (O&apos;zbek tili)
                  </span>
                  <div className="prose prose-stone font-serif text-base sm:text-lg leading-relaxed text-zinc-900 whitespace-pre-wrap font-medium">
                    {book.excerpt.translatedText}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Taqrizlar — approved reviews of this book. The API only ever
              loads approved ones, so there is nothing to filter here. */}
          <section className="mt-16 sm:mt-20 border-t border-stone-200 pt-12 sm:pt-16">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-serif text-2xl text-zinc-900">
                {tTaqriz("sectionTitle")}
              </h2>
              {book.averageScore !== null && book.averageScore !== undefined && (
                <div className="text-right shrink-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    {tTaqriz("overall")}
                  </span>
                  <span className="mt-1 inline-block">
                    <ScoreBadge score={book.averageScore} />
                  </span>
                </div>
              )}
            </div>

            {!book.taqrizlar || book.taqrizlar.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">{tTaqriz("empty")}</p>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {book.taqrizlar.map((taqriz) => (
                  <TaqrizCard
                    key={taqriz.id}
                    taqriz={taqriz}
                    context="book"
                    readMoreLabel={tTaqriz("readMore")}
                    shareText={taqrizShareText({ name: taqriz.taqrizchi?.name, title: book.uzbekTitle }, tTaqriz)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Lines from the book, as editors chose them. Hidden when there are none. */}
          {book.quotes && book.quotes.length > 0 && (
            <section className="mt-16 sm:mt-20 border-t border-stone-200 pt-12 sm:pt-16">
              <h2 className="font-serif text-2xl text-zinc-900">{tQuotes("quotesTitle")}</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {book.quotes.map((quote) => (
                  <QuoteBlock key={quote.id} quote={quote} bookId={id} author={book.author} />
                ))}
              </div>
            </section>
          )}

          {/* Kitoblarim bot readers: anonymous stars and the reviews they
              chose to publish, and the way to write one in the bot. */}
          <ReaderReviews
            rating={book.readerRating}
            reviews={book.readerReviews ?? []}
            locale={locale}
            botHref={botHref}
            reviewHref={botReviewUrl(isbn)}
            t={tDetail}
          />

          {/* Every printing of the book: publisher, ISBN, translators. */}
          {editions.length > 1 && (
            <section className="mt-16 sm:mt-20 border-t border-stone-200 pt-12">
              <h2 className="font-serif text-2xl text-zinc-900 mb-6">
                {tDetail("editions")} <span className="text-zinc-400">({editions.length})</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {editions.map((edition) => (
                  <EditionCard key={edition.id} edition={edition} t={tDetail} />
                ))}
              </div>
            </section>
          )}

          {relatedBooks.length > 0 && (
            <section className="mt-16 sm:mt-20 border-t border-stone-200 pt-12">
              <h2 className="font-serif text-2xl text-zinc-900 mb-6">
                {tDetail("related")}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {relatedBooks.map((b) => (
                  <RelatedBook key={b.id} book={b} />
                ))}
              </div>
            </section>
          )}
        </Container>
      </main>
    </>
  );
}

type Translate = Awaited<ReturnType<typeof getTranslations>>;

function EditionCard({ edition, t }: { edition: Edition; t: Translate }) {
  const translators = edition.translators.filter((c) => c.role !== "editor");
  const editors = edition.translators.filter((c) => c.role === "editor");
  const specs: [string, string | number | null | undefined][] = [
    [t("isbn"), edition.isbn],
    [t("language"), edition.language],
    [t("script"), edition.script],
    [t("pages"), edition.pages],
    [t("binding"), edition.coverType],
    [t("format"), edition.paperFormat],
  ];

  return (
    <article className="flex gap-4 rounded-xl border border-stone-200 bg-white p-4">
      <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded bg-stone-100 ring-1 ring-stone-200">
        {edition.coverUrl ? (
          <Image src={edition.coverUrl} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-6 w-6 text-stone-300" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-serif text-base text-zinc-900">
          {edition.publisher ? (
            <Link href={`/publisher/${edition.publisher.slug}`} className="hover:text-forest-800">
              {edition.publisher.name}
            </Link>
          ) : (
            "—"
          )}
          {edition.year ? <span className="text-zinc-400"> · {edition.year}</span> : null}
        </p>
        {edition.title && <p className="mt-0.5 italic text-zinc-500 truncate">{edition.title}</p>}
        {translators.length > 0 && (
          <p className="mt-1 text-xs text-zinc-500">
            {t("translatedBy")}: <Credits credits={translators} />
          </p>
        )}
        {editors.length > 0 && (
          <p className="mt-0.5 text-xs text-zinc-500">
            {t("editedBy")}: <Credits credits={editors} />
          </p>
        )}
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {specs
            .filter(([, value]) => value !== null && value !== undefined && value !== "")
            .map(([label, value]) => (
              <div key={label} className="flex gap-1 min-w-0">
                <dt className="text-zinc-400">{label}:</dt>
                <dd className="text-zinc-700 truncate">{value}</dd>
              </div>
            ))}
        </dl>
      </div>
    </article>
  );
}

function Credits({ credits }: { credits: Edition["translators"] }) {
  return (
    <>
      {credits.map((credit, i) => (
        <span key={credit.slug}>
          {i > 0 && ", "}
          <Link href={`/translator/${credit.slug}`} className="text-zinc-700 hover:text-forest-800">
            {credit.name}
          </Link>
        </span>
      ))}
    </>
  );
}

function RelatedBook({ book }: { book: BookWithTranslator }) {
  return (
    <Link href={`/book/${book.id}`} className="group flex flex-col">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-zinc-100 shadow-sm ring-1 ring-zinc-200 transition-[transform,box-shadow] duration-300 group-hover:-translate-y-1 group-hover:shadow-md group-active:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={book.uzbekTitle}
            fill
            sizes="(min-width: 640px) 25vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3">
            <span className="font-serif text-center text-sm text-stone-400">{book.uzbekTitle}</span>
          </div>
        )}
      </div>
      <h3 className="mt-3 font-serif text-base text-zinc-900 group-hover:text-forest-800 transition-colors line-clamp-1">
        {book.uzbekTitle}
      </h3>
      <p className="text-xs text-zinc-500 truncate">{[book.author, book.year].filter(Boolean).join(" · ")}</p>
    </Link>
  );
}
