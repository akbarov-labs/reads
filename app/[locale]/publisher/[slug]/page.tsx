import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPublishers, getPublisherBySlug } from "@/lib/api";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { ArrowLeft, BookOpen, Building2 } from "lucide-react";

type PageParams = { locale: string; slug: string };

function publisherColor(name: string): string {
  const colors = [
    "from-stone-100 to-stone-200 text-stone-700",
    "from-amber-50 to-amber-100 text-amber-800",
    "from-orange-50 to-orange-100 text-orange-800",
    "from-yellow-50 to-yellow-100 text-yellow-800",
    "from-lime-50 to-lime-100 text-lime-800",
  ];
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
  const publisher = await getPublisherBySlug(slug, locale);
  if (!publisher) return { robots: { index: false, follow: false } };

  return {
    title: `${publisher.name} — Nashriyot kitoblari | Reads`,
    description: `${publisher.name} nashriyoti tomonidan chop etilgan tarjima kitoblar, mualliflar va tarjimonlar.`,
  };
}

export default async function PublisherDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [publisher, tPublisher, tBookCard] = await Promise.all([
    getPublisherBySlug(slug, locale),
    getTranslations("publisherDetail"),
    getTranslations("bookCard"),
  ]);

  if (!publisher) notFound();

  // Deduplicate authors and translators
  const authorsSet = new Set<string>();
  const translatorsMap = new Map<string, { slug: string; name: string }>();

  for (const b of publisher.books) {
    if (b.author) authorsSet.add(b.author);
    if (b.translatorSlug && !translatorsMap.has(b.translatorSlug)) {
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
                Reads
              </Link>
              <span>/</span>
              <Link href="/publishers" className="hover:text-zinc-600 transition-colors">
                Publishers
              </Link>
              <span>/</span>
              <span className="text-zinc-700 truncate max-w-xs">{publisher.name}</span>
            </nav>
          </div>

          {/* Publisher Header */}
          <div className="rounded-2xl border border-stone-200 overflow-hidden bg-white shadow-xs">
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
                  <span className="text-xs uppercase tracking-widest text-zinc-600 font-semibold">
                    Nashriyot
                  </span>
                  <h1 className="mt-1 font-serif text-3xl sm:text-4xl text-zinc-900 font-semibold">
                    {publisher.name}
                  </h1>

                  <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 shadow-xs px-3.5 py-1 text-xs font-medium text-zinc-800">
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
              {publisher.books.map((book) => (
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
                    <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">
                      {book.author}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Tarjimon: {book.translatorName} · {book.year}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
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
                    Tarjimonlar
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {translators.map((t) => (
                      <Link
                        key={t.slug}
                        href={`/translator/${t.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3.5 py-1.5 text-xs text-zinc-700 hover:border-amber-300 hover:text-amber-800 transition-colors"
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
                    Mualliflar
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
