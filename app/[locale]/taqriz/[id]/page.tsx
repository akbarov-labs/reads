import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTaqrizById } from "@/lib/api";
import { localeAlternates, type Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { ScoreBadge, AspectBreakdown } from "@/components/ScoreBadge";
import { safeExternalUrl } from "@/lib/safeUrl";
import { ArrowLeft, CirclePlay } from "lucide-react";

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
  const taqriz = await getTaqrizById(id, locale);

  // A taqriz awaiting moderation is a 404 from the API, so there is nothing
  // here to index.
  if (!taqriz) return { robots: { index: false, follow: false } };

  const t = await getTranslations({ locale, namespace: "taqriz" });
  const title = taqriz.book
    ? `${taqriz.book.uzbekTitle} — ${t("sectionTitle")}`
    : t("sectionTitle");

  return {
    title: taqriz.taqrizchi ? `${title} | ${taqriz.taqrizchi.name}` : title,
    // The opening of the review itself is a better description than anything
    // generated, and it is already the author's own words.
    description: taqriz.body.slice(0, 160),
    alternates: localeAlternates(locale as Locale, `/taqriz/${id}`),
  };
}

export default async function TaqrizPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [taqriz, t] = await Promise.all([
    getTaqrizById(id, locale),
    getTranslations("taqriz"),
  ]);

  if (!taqriz) notFound();

  const video = safeExternalUrl(taqriz.youtubeUrl);
  const aspectLabels: Record<string, string> = {
    plot: t("aspects.plot"),
    style: t("aspects.style"),
    translation: t("aspects.translation"),
    cover: t("aspects.cover"),
    overall: t("aspects.overall"),
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <SiteHeader />
      <main className="flex-1">
        <Container className="py-10 sm:py-14">
          {taqriz.book && (
            <Link
              href={`/book/${taqriz.book.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-amber-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToBook")}
            </Link>
          )}

          <article className="mt-8 max-w-3xl">
            {/* The book being reviewed */}
            {taqriz.book && (
              <Link
                href={`/book/${taqriz.book.id}`}
                className="group flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-4 hover:border-amber-300 transition-colors"
              >
                <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded bg-stone-100 ring-1 ring-stone-200">
                  {taqriz.book.coverUrl && (
                    <Image
                      src={taqriz.book.coverUrl}
                      alt={taqriz.book.uzbekTitle}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    {t("about")}
                  </span>
                  <h1 className="font-serif text-xl text-zinc-900 group-hover:text-amber-800 transition-colors">
                    {taqriz.book.uzbekTitle}
                  </h1>
                  <p className="mt-0.5 text-sm text-zinc-500">{taqriz.book.author}</p>
                </div>
              </Link>
            )}

            {/* Who wrote it, and the headline score */}
            <div className="mt-8 flex items-center justify-between gap-4 border-b border-stone-200 pb-6">
              {taqriz.taqrizchi ? (
                <Link
                  href={`/taqrizchi/${taqriz.taqrizchi.slug}`}
                  className="group flex items-center gap-3"
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-stone-100 border border-stone-200">
                    {taqriz.taqrizchi.avatarUrl ? (
                      <Image
                        src={taqriz.taqrizchi.avatarUrl}
                        alt={taqriz.taqrizchi.name}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-serif text-stone-400">
                        {taqriz.taqrizchi.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      {t("writtenBy")}
                    </span>
                    <p className="font-serif text-base text-zinc-900 group-hover:text-amber-800 transition-colors">
                      {taqriz.taqrizchi.name}
                    </p>
                  </div>
                </Link>
              ) : (
                <span />
              )}

              <div className="text-right">
                {taqriz.averageScore !== null && taqriz.averageScore !== undefined && (
                  <>
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      {t("overall")}
                    </span>
                    <span className="mt-1 inline-block">
                      <ScoreBadge score={taqriz.averageScore} size="lg" />
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* The review */}
            <div className="mt-8 whitespace-pre-line font-serif text-[17px] leading-relaxed text-zinc-800">
              {taqriz.body}
            </div>

            {video && (
              <a
                href={video}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-zinc-700 hover:border-red-300 hover:text-red-700 transition-colors"
              >
                <CirclePlay className="h-4 w-4" />
                {t("watchVideo")}
              </a>
            )}

            {/* Per-aspect scores, if any were given */}
            <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-6">
              <h2 className="font-serif text-lg text-zinc-900 mb-4">
                {t("breakdown")}
              </h2>
              <AspectBreakdown scores={taqriz.scores} labels={aspectLabels} />
            </section>
          </article>
        </Container>
      </main>
    </div>
  );
}
