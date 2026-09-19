import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTaqrizchiBySlug } from "@/lib/api";
import { localeAlternates, type Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { SocialLinks } from "@/components/SocialLinks";
import { TaqrizCard } from "@/components/TaqrizCard";
import { ArrowLeft, MapPin } from "lucide-react";

type PageParams = { locale: string; slug: string };

export async function generateStaticParams(): Promise<PageParams[]> {
  // Built on demand — see the sibling detail pages for why the build does
  // not enumerate these.
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const taqrizchi = await getTaqrizchiBySlug(slug, locale);

  if (!taqrizchi) return { robots: { index: false, follow: false } };

  const t = await getTranslations({ locale, namespace: "taqrizchilar" });

  return {
    title: `${taqrizchi.name} — ${taqrizchi.title || t("defaultRole")}`,
    description:
      taqrizchi.bio ||
      `${taqrizchi.name}: ${t("taqrizlar", { count: taqrizchi.totalTaqrizlar })}.`,
    alternates: localeAlternates(locale as Locale, `/taqrizchi/${slug}`),
  };
}

export default async function TaqrizchiProfilePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [taqrizchi, t, tTaqriz] = await Promise.all([
    getTaqrizchiBySlug(slug, locale),
    getTranslations("taqrizchilar"),
    getTranslations("taqriz"),
  ]);

  if (!taqrizchi) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <SiteHeader />
      <main className="flex-1">
        <Container className="py-10 sm:py-14">
          <Link
            href="/taqrizchilar"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-amber-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("seeAll")}
          </Link>

          <header className="mt-8 flex flex-col gap-6 border-b border-stone-200 pb-10 sm:flex-row sm:items-start">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-stone-100 border border-stone-200">
              {taqrizchi.avatarUrl ? (
                <Image
                  src={taqrizchi.avatarUrl}
                  alt={taqrizchi.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-serif text-3xl text-stone-400">
                  {taqrizchi.name.charAt(0)}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-3xl sm:text-4xl text-zinc-900 tracking-tight">
                {taqrizchi.name}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                {taqrizchi.title || t("defaultRole")}
              </p>
              {taqrizchi.location && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-400">
                  <MapPin className="h-4 w-4" />
                  {taqrizchi.location}
                </p>
              )}
              {taqrizchi.bio && (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600">
                  {taqrizchi.bio}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <span className="text-xs uppercase tracking-widest2 text-zinc-400">
                  {t("taqrizlar", { count: taqrizchi.totalTaqrizlar })}
                </span>
                {taqrizchi.socialLinks.length > 0 && (
                  <SocialLinks links={taqrizchi.socialLinks} />
                )}
              </div>
            </div>
          </header>

          <section className="mt-10">
            <h2 className="font-serif text-2xl text-zinc-900">
              {tTaqriz("sectionTitle")}
            </h2>

            {taqrizchi.taqrizlar.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">{tTaqriz("empty")}</p>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {taqrizchi.taqrizlar.map((taqriz) => (
                  <TaqrizCard
                    key={taqriz.id}
                    taqriz={taqriz}
                    context="profile"
                    readMoreLabel={tTaqriz("readMore")}
                  />
                ))}
              </div>
            )}
          </section>
        </Container>
      </main>
    </div>
  );
}
