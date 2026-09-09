import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getTranslatorBySlug } from "@/lib/api";
import { getTranslatorStats } from "@/lib/translatorStats";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { ProfileHeader } from "@/components/ProfileHeader";
import { StatsBar } from "@/components/StatsBar";
import { BookGrid } from "@/components/BookGrid";
import { ExcerptReader } from "@/components/ExcerptReader";

type PageParams = { locale: string; slug: string };

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
  if (!translator) return {};
  return {
    title: t("profileTitle", { name: translator.name }),
    description: translator.bio,
  };
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
