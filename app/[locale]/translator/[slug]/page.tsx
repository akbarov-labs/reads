import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getTranslatorBySlug } from "@/lib/api";
import { getTranslatorStats } from "@/lib/translatorStats";
import { translatorMetadata } from "@/lib/seo";
import { translatorGraph } from "@/lib/jsonld";
import type { Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { ProfileHeader } from "@/components/ProfileHeader";
import { StatsBar } from "@/components/StatsBar";
import { BookGrid } from "@/components/BookGrid";
import { ExcerptReader } from "@/components/ExcerptReader";
import { JsonLd } from "@/components/JsonLd";

type PageParams = { locale: string; slug: string };

function profilePath(slug: string) {
  return `/translator/${slug}`;
}

/**
 * Empty for the same reason as the locale layout's: enumerating slugs means
 * calling the API, and the API is unreachable from the machine that builds
 * the production image.
 *
 * Every profile is therefore generated on its first request and cached from
 * then on, which is the path new profiles already took — this just makes it
 * the path all of them take.
 */
export async function generateStaticParams(): Promise<PageParams[]> {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const [translator, t] = await Promise.all([
    getTranslatorBySlug(slug, locale),
    getTranslations({ locale, namespace: "site" }),
  ]);

  // A missing profile renders the 404 below; telling search engines to index
  // a "not found" page is worse than saying nothing.
  if (!translator) {
    return { robots: { index: false, follow: false } };
  }

  return translatorMetadata({
    translator,
    locale: locale as Locale,
    path: profilePath(slug),
    fallback: {
      title: t("profileTitle", { name: translator.name }),
      description: translator.bio,
    },
  });
}

export default async function TranslatorProfilePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [translator, t, tSite] = await Promise.all([
    getTranslatorBySlug(slug, locale),
    getTranslations("stats"),
    getTranslations("site"),
  ]);
  if (!translator) notFound();

  const stats = getTranslatorStats(t, translator);

  return (
    <>
      <JsonLd
        data={translatorGraph({
          translator,
          locale: locale as Locale,
          path: profilePath(slug),
          breadcrumb: {
            home: tSite("brand"),
            current: translator.name,
          },
        })}
      />
      <SiteHeader
        name={translator.name}
        subtitle={translator.title || tSite("roleTag")}
      />
      <main>
        <Container>
          <ProfileHeader translator={translator} />
          <StatsBar stats={stats} />
          <BookGrid books={translator.books} />
          <ExcerptReader books={translator.books} />
        </Container>
      </main>
    </>
  );
}
