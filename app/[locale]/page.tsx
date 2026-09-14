import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAuthors, getBooks, getPublishers, getTranslators } from "@/lib/api";
import { localeAlternates, type Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { BookGrid } from "@/components/BookGrid";
import { TranslatorGrid } from "@/components/TranslatorGrid";
import { AuthorGrid } from "@/components/AuthorGrid";
import { PublisherGrid } from "@/components/PublisherGrid";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const typedLocale = locale as Locale;

  const t = await getTranslations({ locale, namespace: "site" });
  return { title: t("homeTitle"), description: t("homeDescription"), alternates: localeAlternates(typedLocale) };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [translators, authors, books, publishers, tHome, tFooter] = await Promise.all([
    getTranslators(locale),
    getAuthors(locale),
    getBooks(locale),
    getPublishers(locale),
    getTranslations("home"),
    getTranslations("footer"),
  ]);

  if (translators.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <SiteHeader />
        <main className="flex-1">
          <Container className="py-24 text-center text-zinc-500">
            <p>{tHome("empty")}</p>
          </Container>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <SiteHeader />
      <main className="flex-1">
        <Container>
          <TranslatorGrid translators={translators} />
          <AuthorGrid authors={authors} />
          <PublisherGrid publishers={publishers} />
          <BookGrid books={books} />
        </Container>
      </main>
      <footer className="border-t border-zinc-200 py-10 text-center text-xs text-zinc-500">
        <Container>
          <p className="font-serif italic text-sm text-zinc-700 mb-1">
            «{tFooter("quote")}»
          </p>
          <p>
            © {new Date().getFullYear()} Reads. {tFooter("personalPage")}.
          </p>
        </Container>
      </footer>
    </div>
  );
}
