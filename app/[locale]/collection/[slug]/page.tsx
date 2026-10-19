import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCollection } from "@/lib/api";
import { localeAlternates, type Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { ShareLinks } from "@/components/ShareLinks";

type PageParams = { locale: string; slug: string };

export async function generateStaticParams(): Promise<PageParams[]> {
  // Built on demand, like the other detail pages.
  return [];
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const collection = await getCollection(slug, locale);
  if (!collection) return { robots: { index: false, follow: false } };

  const alternates = localeAlternates(locale as Locale, `/collection/${slug}`);
  return {
    title: collection.title,
    description: collection.description ?? undefined,
    alternates,
    openGraph: { title: collection.title, description: collection.description ?? undefined, url: alternates.canonical },
  };
}

/**
 * One collection: the editor's title and lines, then its books in order —
 * each with the translation the list means, when it means one, and why it
 * is there.
 */
export default async function CollectionPage({ params }: { params: Promise<PageParams> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [collection, t] = await Promise.all([getCollection(slug, locale), getTranslations("collections")]);
  if (!collection) notFound();
  const items = collection.items ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <SiteHeader />
      <main className="flex-1">
        <Container className="py-10 sm:py-14">
          <Link
            href="/collections"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-forest-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("back")}
          </Link>

          <header className="mt-8 max-w-3xl">
            <h1 className="font-serif text-3xl sm:text-4xl text-zinc-900 tracking-tight">{collection.title}</h1>
            {collection.description && (
              <p className="mt-3 text-base leading-relaxed text-zinc-600 whitespace-pre-line">{collection.description}</p>
            )}
            <p className="mt-3 text-sm text-zinc-400">{t("bookCount", { count: items.length })}</p>
            <ShareLinks path={`/collection/${slug}`} text={collection.title} className="mt-3 -ml-2" />
          </header>

          <ol className="mt-10 max-w-3xl divide-y divide-stone-200 border-t border-stone-200">
            {items.map((item, i) => {
              const { book, edition } = item;
              const translators = edition?.translators ?? (book.translatorName ? [book.translatorName] : []);
              return (
                <li key={book.id} className="flex gap-4 sm:gap-5 py-6">
                  <span className="w-6 shrink-0 pt-1 text-right font-serif text-lg text-zinc-300 tabular-nums">{i + 1}</span>
                  <Link
                    href={`/book/${book.id}`}
                    className="relative h-28 w-[4.5rem] shrink-0 overflow-hidden rounded-sm bg-stone-100 shadow-sm ring-1 ring-stone-200"
                  >
                    {book.coverUrl ? (
                      <Image src={book.coverUrl} alt={book.uzbekTitle} fill sizes="72px" className="object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center p-1 text-center font-serif text-[10px] text-stone-400">
                        {book.uzbekTitle}
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0">
                    <Link
                      href={`/book/${book.id}`}
                      className="font-serif text-lg leading-snug text-zinc-900 hover:text-forest-800 transition-colors"
                    >
                      {book.uzbekTitle}
                    </Link>
                    {book.author && <p className="text-sm text-zinc-500">{book.author}</p>}
                    {translators.length > 0 && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {t("translatedBy", { names: translators.join(", ") })}
                        {edition && [edition.publisher, edition.year].filter(Boolean).length > 0
                          ? ` · ${[edition.publisher, edition.year].filter(Boolean).join(", ")}`
                          : null}
                      </p>
                    )}
                    {item.note && (
                      <p className="mt-2 text-sm leading-relaxed text-zinc-700 whitespace-pre-line">{item.note}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Container>
      </main>
    </div>
  );
}
