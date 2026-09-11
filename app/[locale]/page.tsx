import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getTranslators } from "@/lib/api";
import { getTranslatorStats } from "@/lib/translatorStats";
import { translatorMetadata } from "@/lib/seo";
import { translatorGraph } from "@/lib/jsonld";
import { localeAlternates, type Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { ProfileHeader } from "@/components/ProfileHeader";
import { StatsBar } from "@/components/StatsBar";
import { BookGrid } from "@/components/BookGrid";
import { ExcerptReader } from "@/components/ExcerptReader";
import { JsonLd } from "@/components/JsonLd";

/**
 * The home page *is* the featured translator's page, so its metadata is that
 * translator's — resolved by Reads-admin, which means it already reflects
 * the current book count and any admin override, with no build step.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const typedLocale = locale as Locale;

  const [translators, t] = await Promise.all([
    getTranslators(locale),
    getTranslations({ locale, namespace: "site" }),
  ]);
  const translator = translators[0];

  if (!translator) {
    return {
      title: t("homeTitle"),
      description: t("homeDescription"),
      alternates: localeAlternates(typedLocale),
    };
  }

  return translatorMetadata({
    translator,
    locale: typedLocale,
    fallback: {
      title: t("profileTitle", { name: translator.name }),
      description: translator.bio,
    },
  });
}

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
      {/* Machine-readable version of everything below: who this is, which
          languages they work between, and every book with the right credit
          on it. This is what answer engines read instead of guessing from
          the prose. */}
      <JsonLd
        data={translatorGraph({ translator, locale: locale as Locale })}
      />
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
