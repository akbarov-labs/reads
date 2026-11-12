import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getDeals } from "@/lib/api";
import { stillOn } from "@/lib/deals";
import { localeAlternates, type Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { DealCard } from "@/components/DealCard";
import type { Deal } from "@/lib/types";

/** Reads ?kind= from searchParams; see the books page for why. */
export const dynamic = "force-dynamic";

const KINDS = ["discount", "contest"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "deals" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: localeAlternates(locale as Locale, "/chegirmalar"),
  };
}

/**
 * Chegirmalar: publishers' and shops' discounts, promo codes and book
 * giveaways that are on today, ending soonest first. Each button goes
 * through /go/deal, which counts the click. Filtered by kind with ?kind=.
 */
export default async function DealsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { locale } = await params;
  const { kind: rawKind } = await searchParams;
  setRequestLocale(locale);

  const kind = KINDS.includes(rawKind as Deal["kind"]) ? (rawKind as Deal["kind"]) : undefined;
  const [all, t] = await Promise.all([getDeals(locale, { limit: 48 }), getTranslations("deals")]);

  const live = stillOn(all);
  const shown = kind ? live.filter((deal) => deal.kind === kind) : live;
  const tabs = [
    { key: undefined, label: t("all"), count: live.length },
    { key: "discount" as const, label: t("discounts"), count: live.filter((deal) => deal.kind === "discount").length },
    { key: "contest" as const, label: t("contests"), count: live.filter((deal) => deal.kind === "contest").length },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <SiteHeader />
      <main className="flex-1">
        <Container className="py-12 sm:py-16">
          <div className="mb-8 border-b border-stone-200 pb-6">
            <h1 className="font-serif text-3xl sm:text-4xl text-zinc-900 tracking-tight">{t("heading")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">{t("lead")}</p>

            <nav aria-label={t("heading")} className="mt-5 flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <Link
                  key={tab.label}
                  href={tab.key ? `/chegirmalar?kind=${tab.key}` : "/chegirmalar"}
                  aria-current={kind === tab.key ? "page" : undefined}
                  className={
                    kind === tab.key
                      ? "rounded-full bg-forest-700 px-3 py-1 text-xs text-white"
                      : "rounded-full border border-stone-300 px-3 py-1 text-xs text-zinc-600 hover:border-forest-400 hover:text-forest-800"
                  }
                >
                  {tab.label} <span className="tabular-nums opacity-70">{tab.count}</span>
                </Link>
              ))}
            </nav>
          </div>

          {shown.length > 0 ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((deal) => (
                  <DealCard key={deal.id} deal={deal} locale={locale} />
                ))}
              </div>
              <p className="mt-10 max-w-2xl text-xs leading-relaxed text-zinc-500">{t("note")}</p>
            </>
          ) : (
            <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-zinc-500">{t("empty")}</p>
          )}
        </Container>
      </main>
    </div>
  );
}
