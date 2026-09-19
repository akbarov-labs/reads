import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getTaqrizchilar } from "@/lib/api";
import { localeAlternates, type Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { TaqrizchiCard } from "@/components/TaqrizchiCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "taqrizchilar" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: localeAlternates(locale as Locale, "/taqrizchilar"),
  };
}

export default async function TaqrizchilarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [taqrizchilar, t] = await Promise.all([
    getTaqrizchilar(locale),
    getTranslations("taqrizchilar"),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <SiteHeader />
      <main className="flex-1">
        <Container className="py-12 sm:py-16">
          <div className="mb-10 pb-6 border-b border-stone-200">
            <h1 className="font-serif text-3xl sm:text-4xl text-zinc-900 tracking-tight">
              {t("pageTitle")}
            </h1>
            <p className="mt-2 text-zinc-500 text-sm">{t("pageDescription")}</p>
          </div>

          {taqrizchilar.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("empty")}</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {taqrizchilar.map((taqrizchi) => (
                <TaqrizchiCard
                  key={taqrizchi.slug}
                  taqrizchi={taqrizchi}
                  countLabel={t("taqrizlar", { count: taqrizchi.totalTaqrizlar })}
                  viewLabel={t("viewProfile")}
                />
              ))}
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}
