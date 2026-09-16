import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAllBooks, getBookById } from "@/lib/api";
import { slugify } from "@/lib/slug";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { ArrowLeft, BookOpen, User } from "lucide-react";

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
  const book = await getBookById(id, locale);
  if (!book) return { robots: { index: false, follow: false } };

  return {
    title: `${book.uzbekTitle} — ${book.author} | Reads`,
    description: `${book.uzbekTitle} (${book.originalTitle}), muallif: ${book.author}, tarjimon: ${book.translatorName}, nashriyot: ${book.publisher}.`,
  };
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [book, tDetail, tCard, allBooks] = await Promise.all([
    getBookById(id, locale),
    getTranslations("bookDetail"),
    getTranslations("bookCard"),
    getAllBooks(locale),
  ]);

  if (!book) notFound();

  const authorSlug = slugify(book.author);
  const publisherSlug = slugify(book.publisher);

  const roleLabel =
    book.role === "author"
      ? tCard("roleAuthor")
      : book.role === "editor"
      ? tCard("roleEditor")
      : tCard("roleTranslator");

  const otherBooksByAuthor = allBooks
    .filter((b) => b.id !== book.id && slugify(b.author) === authorSlug)
    .slice(0, 4);

  const otherBooksByTranslator = allBooks
    .filter((b) => b.id !== book.id && b.translatorSlug === book.translatorSlug)
    .slice(0, 4);

  return (
    <>
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
                Reads
              </Link>
              <span>/</span>
              <Link href="/books" className="hover:text-zinc-600 transition-colors">
                Books
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
                <div className="absolute top-4 left-4">
                  <span className="inline-block rounded-md border border-white/40 bg-white/90 backdrop-blur-md px-3 py-1 text-xs font-medium tracking-wide text-zinc-800 shadow-sm">
                    {roleLabel}
                  </span>
                </div>
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

              {/* Author, Translator, Publisher Cards */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Author Card */}
                <Link
                  href={`/author/${authorSlug}`}
                  className="group flex items-center gap-3.5 rounded-xl border border-stone-200 p-4 bg-white hover:border-amber-300 hover:shadow-sm transition-all"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-stone-200 bg-amber-50 flex items-center justify-center text-amber-800 font-serif font-medium">
                    {book.authorImageUrl ? (
                      <Image
                        src={book.authorImageUrl}
                        alt={book.author}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <span>{book.author.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      {tDetail("author")}
                    </span>
                    <p className="font-serif text-base font-medium text-zinc-900 group-hover:text-amber-800 transition-colors truncate">
                      {book.author}
                    </p>
                  </div>
                </Link>

                {/* Translator Card */}
                <Link
                  href={`/translator/${book.translatorSlug}`}
                  className="group flex items-center gap-3.5 rounded-xl border border-stone-200 p-4 bg-white hover:border-amber-300 hover:shadow-sm transition-all"
                >
                  <div className="h-12 w-12 shrink-0 rounded-full border border-stone-200 bg-stone-100 flex items-center justify-center text-stone-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      {tDetail("translator")}
                    </span>
                    <p className="font-serif text-base font-medium text-zinc-900 group-hover:text-amber-800 transition-colors truncate">
                      {book.translatorName}
                    </p>
                  </div>
                </Link>
              </div>

              {/* Publication Specs */}
              <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50/70 p-6">
                <h2 className="font-serif text-lg font-medium text-zinc-900 mb-4">
                  {tDetail("details")}
                </h2>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
                      {tDetail("publisher")}
                    </dt>
                    <dd className="mt-1 font-serif text-base text-zinc-900">
                      <Link
                        href={`/publisher/${publisherSlug}`}
                        className="hover:text-amber-800 underline-offset-4 hover:underline transition-colors"
                      >
                        {book.publisher}
                      </Link>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
                      {tDetail("year")}
                    </dt>
                    <dd className="mt-1 font-serif text-base text-zinc-900">
                      {book.year}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
                      {tDetail("sourceLanguage")}
                    </dt>
                    <dd className="mt-1 font-serif text-base text-zinc-900">
                      {book.sourceLanguage || "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Excerpt Section (if available) */}
          {book.excerpt && (
            <section className="mt-16 sm:mt-20 border-t border-stone-200 pt-12 sm:pt-16">
              <div className="mb-8">
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-800">
                  {book.uzbekTitle}
                </span>
                <h2 className="mt-1 font-serif text-2xl sm:text-3xl text-zinc-900">
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
                  <span className="text-xs uppercase tracking-wider text-amber-800 font-semibold mb-3">
                    {tDetail("translatedText")} (O&apos;zbek tili)
                  </span>
                  <div className="prose prose-stone font-serif text-base sm:text-lg leading-relaxed text-zinc-900 whitespace-pre-wrap font-medium">
                    {book.excerpt.translatedText}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Related books by author */}
          {otherBooksByAuthor.length > 0 && (
            <section className="mt-16 sm:mt-20 border-t border-stone-200 pt-12">
              <h2 className="font-serif text-2xl text-zinc-900 mb-6">
                {tDetail("otherByAuthor")}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {otherBooksByAuthor.map((b) => (
                  <Link
                    key={b.id}
                    href={`/book/${b.id}`}
                    className="group flex flex-col"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-100 shadow-sm ring-1 ring-zinc-200 transition-shadow group-hover:shadow-md">
                      <Image
                        src={b.coverUrl}
                        alt={b.uzbekTitle}
                        fill
                        sizes="(min-width: 640px) 25vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                    <h3 className="mt-3 font-serif text-base text-zinc-900 group-hover:text-amber-800 transition-colors line-clamp-1">
                      {b.uzbekTitle}
                    </h3>
                    <p className="text-xs text-zinc-500">{b.year}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Related books by translator */}
          {otherBooksByTranslator.length > 0 && (
            <section className="mt-14 border-t border-stone-200 pt-12">
              <h2 className="font-serif text-2xl text-zinc-900 mb-6">
                {tDetail("otherByTranslator")}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {otherBooksByTranslator.map((b) => (
                  <Link
                    key={b.id}
                    href={`/book/${b.id}`}
                    className="group flex flex-col"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-100 shadow-sm ring-1 ring-zinc-200 transition-shadow group-hover:shadow-md">
                      <Image
                        src={b.coverUrl}
                        alt={b.uzbekTitle}
                        fill
                        sizes="(min-width: 640px) 25vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                    <h3 className="mt-3 font-serif text-base text-zinc-900 group-hover:text-amber-800 transition-colors line-clamp-1">
                      {b.uzbekTitle}
                    </h3>
                    <p className="text-xs text-zinc-500">{b.author} · {b.year}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </Container>
      </main>
    </>
  );
}
