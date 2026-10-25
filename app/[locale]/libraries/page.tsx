import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLibraries } from "@/lib/api";
import { localeAlternates, type Locale } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { LibraryCard } from "@/components/LibraryCard";

/** Reads ?region= from searchParams; see the publishers page for why. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "libraries" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: localeAlternates(locale as Locale, "/libraries"),
  };
}

export default async function LibrariesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ region?: string }>;
}) {
  const { locale } = await params;
  const { region } = await searchParams;
  setRequestLocale(locale);

  // A few dozen at most, so all of them, and the region chips are the
  // regions that have one.
  const [libraries, t] = await Promise.all([getLibraries(locale), getTranslations("libraries")]);

  const regions = Array.from(new Set(libraries.map((library) => library.region))).sort((a, b) => a.localeCompare(b));
  const shown = region ? libraries.filter((library) => library.region === region) : libraries;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <SiteHeader />
      <main className="flex-1">
        <Container className="py-12 sm:py-16">
          <div className="mb-8 pb-6 border-b border-stone-200">
            <h1 className="font-serif text-3xl sm:text-4xl text-zinc-900 tracking-tight">{t("pageTitle")}</h1>
            <p className="mt-2 text-zinc-500 text-sm">{t("pageDescription")}</p>
            <p className="mt-3 text-sm text-zinc-700">{t("count", { count: shown.length })}</p>
          </div>

          {regions.length > 1 ? (
            <nav aria-label={t("allRegions")} className="mb-8 flex flex-wrap gap-2">
              <RegionChip href="/libraries" active={!region} label={t("allRegions")} />
              {regions.map((name) => (
                <RegionChip
                  key={name}
                  href={`/libraries?region=${encodeURIComponent(name)}`}
                  active={region === name}
                  label={name}
                />
              ))}
            </nav>
          ) : null}

          {shown.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {shown.map((library) => (
                <LibraryCard key={library.slug} library={library} />
              ))}
            </div>
          ) : (
            <p className="text-zinc-500">{t("empty")}</p>
          )}
        </Container>
      </main>
    </div>
  );
}

function RegionChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-full bg-forest-700 px-3 py-1 text-xs text-white"
          : "rounded-full border border-stone-300 px-3 py-1 text-xs text-zinc-600 hover:border-forest-400 hover:text-forest-800"
      }
    >
      {label}
    </Link>
  );
}
