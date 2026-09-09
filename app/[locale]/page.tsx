import { getTranslations, setRequestLocale } from "next-intl/server";
import { getTranslators } from "@/lib/api";
import { getTranslatorStats } from "@/lib/translatorStats";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { ProfileHeader } from "@/components/ProfileHeader";
import { StatsBar } from "@/components/StatsBar";
import { BookGrid } from "@/components/BookGrid";
import { ExcerptReader } from "@/components/ExcerptReader";

// The layout's generateMetadata already provides the site-wide title and
// description for this page — nothing translator-specific to override here.

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [translators, t, tSite, tFooter] = await Promise.all([
    getTranslators(locale),
    getTranslations("stats"),
    getTranslations("site"),
    getTranslations("footer"),
  ]);
  const translator = translators[0];

  if (!translator) {
    const tHome = await getTranslations("home");
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

  const stats = getTranslatorStats(t, translator);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <SiteHeader
        name={translator.name}
        subtitle={translator.title || tSite("roleTag")}
      />
      <main className="flex-1">
        <Container>
          <ProfileHeader translator={translator} />
          <StatsBar stats={stats} />
          <BookGrid books={translator.books} />
          <ExcerptReader books={translator.books} />
        </Container>
      </main>
      <footer className="border-t border-zinc-200 py-10 text-center text-xs text-zinc-500">
        <Container>
          <p className="font-serif italic text-sm text-zinc-700 mb-1">
            «{tFooter("quote")}»
          </p>
          <p>
            © {new Date().getFullYear()} {translator.name}.{" "}
            {tFooter("personalPage")}.
          </p>
        </Container>
      </footer>
    </div>
  );
}
