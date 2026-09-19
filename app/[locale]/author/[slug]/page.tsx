import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAuthors, getAuthorBySlug } from "@/lib/api";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { ArrowLeft, BookOpen, User } from "lucide-react";

type PageParams = { locale: string; slug: string };

function initialsColor(name: string): string {
  const colors = [
    "bg-amber-100 text-amber-800",
    "bg-stone-200 text-stone-700",
    "bg-orange-100 text-orange-800",
    "bg-yellow-100 text-yellow-800",
    "bg-lime-100 text-lime-800",
    "bg-teal-100 text-teal-800",
    "bg-sky-100 text-sky-800",
    "bg-violet-100 text-violet-800",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
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
  const author = await getAuthorBySlug(slug, locale);
  if (!author) return { robots: { index: false, follow: false } };

  return {
    title: `${author.name} — O'zbek tiliga tarjima qilingan asarlari | Reads`,
    description: `${author.name} asarlarining o'zbekcha tarjimalari, kitoblari va tarjimonlari haqida to'liq ma'lumot.`,
  };
}

export default async function AuthorDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [author, tAuthor, tBookCard] = await Promise.all([
    getAuthorBySlug(slug, locale),
    getTranslations("authorDetail"),
    getTranslations("bookCard"),
  ]);

  if (!author) notFound();

  // Deduplicate translators who translated this author
  const translatorsMap = new Map<string, { slug: string; name: string }>();
  for (const b of author.books) {
    if (b.translatorSlug && b.translatorName && !translatorsMap.has(b.translatorSlug)) {
      translatorsMap.set(b.translatorSlug, {
        slug: b.translatorSlug,
        name: b.translatorName,
      });
    }
  }
  const translators = Array.from(translatorsMap.values());

  const sourceLanguages = Array.from(
    new Set(author.books.map((b) => b.sourceLanguage).filter(Boolean))
  );

  return (
    <>
      <SiteHeader />
      <main className="py-10 sm:py-14">
        <Container>
          {/* Breadcrumbs & Back */}
          <div className="mb-8 flex items-center justify-between">
            <Link
              href="/authors"
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{tAuthor("back")}</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
              <Link href="/" className="hover:text-zinc-600 transition-colors">
                Reads
              </Link>
              <span>/</span>
              <Link href="/authors" className="hover:text-zinc-600 transition-colors">
                Authors
              </Link>
              <span>/</span>
              <span className="text-zinc-700 truncate max-w-xs">{author.name}</span>
            </nav>
          </div>

          {/* Author Header */}
          <div className="rounded-2xl border border-stone-200 bg-white p-8 sm:p-10 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              {/* Avatar */}
              <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-full border-2 border-stone-200 bg-amber-50 shadow-sm">
                {author.imageUrl ? (
                  <Image
                    src={author.imageUrl}
                    alt={author.name}
                    fill
                    priority
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <span
                    className={`flex h-full w-full items-center justify-center font-serif text-3xl font-medium ${initialsColor(
                      author.name
                    )}`}
                  >
                    {initials(author.name)}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <span className="text-xs uppercase tracking-widest text-amber-800 font-semibold">
                  {tAuthor("about")}
                </span>
                <h1 className="mt-1 font-serif text-3xl sm:text-4xl text-zinc-900 font-semibold">
                  {author.name}
                </h1>

                <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3.5 py-1 text-xs font-medium text-zinc-700">
                    <BookOpen className="h-3.5 w-3.5 text-zinc-500" />
                    {tAuthor("totalBooks", { count: author.bookCount })}
                  </span>

                  {sourceLanguages.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1 text-xs font-medium text-amber-900">
                      {sourceLanguages.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Books in Uzbek */}
          <section className="mt-12 sm:mt-16">
            <div className="mb-8">
              <h2 className="font-serif text-2xl sm:text-3xl text-zinc-900 font-semibold">
                {tAuthor("works")}
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
              {author.books.map((book) => (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  className="group flex flex-col"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-100 shadow-sm ring-1 ring-zinc-200 transition-all duration-200 group-hover:shadow-md group-hover:ring-amber-300">
                    <Image
                      src={book.coverUrl}
                      alt={book.uzbekTitle}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover"
                    />
                    {book.role && (
                      <div className="absolute top-2.5 left-2.5">
                        <span className="inline-block rounded-md border border-white/40 bg-white/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-800 shadow-xs">
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
                    <h3 className="font-serif text-base sm:text-lg text-zinc-900 font-medium group-hover:text-amber-800 transition-colors leading-snug">
                      {book.uzbekTitle}
                    </h3>
                    {book.originalTitle && (
                      <p className="mt-0.5 font-serif text-xs sm:text-sm italic text-zinc-500 truncate">
                        {book.originalTitle}
                      </p>
                    )}
                    {book.translatorName && (
                      <p className="mt-2 text-xs text-zinc-500">
                        Tarjimon:{" "}
                        <span className="text-zinc-800 font-medium">
                          {book.translatorName}
                        </span>
                      </p>
                    )}
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {book.publisher} · {book.year}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Translators section */}
          {translators.length > 0 && (
            <section className="mt-16 sm:mt-20 border-t border-stone-200 pt-12">
              <h2 className="font-serif text-2xl text-zinc-900 mb-6">
                {tAuthor("translators")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {translators.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/translator/${t.slug}`}
                    className="group flex items-center gap-3.5 rounded-xl border border-stone-200 bg-white p-4 hover:border-amber-300 hover:shadow-sm transition-all"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-full border border-stone-200 bg-stone-100 flex items-center justify-center text-stone-600">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-base font-medium text-zinc-900 group-hover:text-amber-800 transition-colors truncate">
                        {t.name}
                      </p>
                      <span className="text-xs text-zinc-400">
                        Tarjimon profili →
                      </span>
                    </div>
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
