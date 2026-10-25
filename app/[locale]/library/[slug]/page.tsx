import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowUpRight, Library as LibraryIcon, MapPin, Phone, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getLibrary, getLibraryBooks } from "@/lib/api";
import { joinPresent, shortDate } from "@/lib/format";
import { libraryPageGraph } from "@/lib/jsonld";
import { localeAlternates, type Locale } from "@/lib/site";
import { safeExternalUrl } from "@/lib/safeUrl";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { JsonLd } from "@/components/JsonLd";
import { BookCard } from "@/components/BookCard";
import { Pagination } from "@/components/Pagination";

type PageParams = { locale: string; slug: string };

/** Reads ?q=, ?available= and ?page= from searchParams; see the publishers page. */
export const dynamic = "force-dynamic";

const PER_PAGE = 24;

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const [library, t] = await Promise.all([
    getLibrary(slug, locale),
    getTranslations({ locale, namespace: "libraryDetail" }),
  ]);
  if (!library) return { robots: { index: false, follow: false } };

  const title = t("metaTitle", { name: library.name });
  const description = t("metaDescription", { name: library.name });
  const alternates = localeAlternates(locale as Locale, `/library/${slug}`);
  return {
    title,
    description,
    alternates,
    openGraph: { type: "website", title, description, url: alternates.canonical },
  };
}

export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<{ q?: string; available?: string; page?: string }>;
}) {
  const { locale, slug } = await params;
  const { q = "", available, page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const onlyAvailable = available === "1";
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const [library, books, t] = await Promise.all([
    getLibrary(slug, locale),
    getLibraryBooks(slug, locale, { page: currentPage, perPage: PER_PAGE, q: q.trim() || undefined, available: onlyAvailable }),
    getTranslations("libraryDetail"),
  ]);

  if (!library) notFound();

  const updated = shortDate(library.holdingsUpdatedAt, locale);
  const mapUrl =
    library.latitude != null && library.longitude != null
      ? `https://yandex.uz/maps/?pt=${library.longitude},${library.latitude}&z=17&l=map`
      : null;
  const contacts = [
    library.phone ? { href: `tel:${library.phone.replace(/[^\d+]/g, "")}`, label: library.phone, icon: "phone" as const } : null,
    safeExternalUrl(library.telegramUrl) ? { href: safeExternalUrl(library.telegramUrl)!, label: "Telegram", icon: "out" as const } : null,
    safeExternalUrl(library.instagramUrl) ? { href: safeExternalUrl(library.instagramUrl)!, label: "Instagram", icon: "out" as const } : null,
    safeExternalUrl(library.websiteUrl) ? { href: safeExternalUrl(library.websiteUrl)!, label: new URL(library.websiteUrl!).hostname, icon: "out" as const } : null,
  ].filter((contact): contact is NonNullable<typeof contact> => contact !== null);

  return (
    <>
      <JsonLd
        data={libraryPageGraph({
          library,
          locale: locale as Locale,
          path: `/library/${slug}`,
          trail: [
            { name: "Kitoblarim", path: "" },
            { name: t("breadcrumb"), path: "/libraries" },
            { name: library.name, path: `/library/${slug}` },
          ],
        })}
      />
      <SiteHeader />
      <main className="py-10 sm:py-14">
        <Container>
          <div className="mb-8 flex items-center justify-between">
            <Link
              href="/libraries"
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t("back")}</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
              <Link href="/" className="hover:text-zinc-600 transition-colors">
                Kitoblarim
              </Link>
              <span>/</span>
              <Link href="/libraries" className="hover:text-zinc-600 transition-colors">
                {t("breadcrumb")}
              </Link>
              <span>/</span>
              <span className="text-zinc-700 truncate max-w-xs">{library.name}</span>
            </nav>
          </div>

          {/* The library, and how to get there */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
              <div className="flex items-start gap-5">
                {library.photoUrl ? (
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-2xl bg-stone-100">
                    <Image src={library.photoUrl} alt={library.name} fill priority sizes="96px" className="object-cover" />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-forest-50">
                    <LibraryIcon aria-hidden="true" className="h-10 w-10 text-forest-700" />
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="font-serif text-3xl sm:text-4xl text-zinc-900 tracking-tight">{library.name}</h1>
                  <p className="mt-2 text-sm text-zinc-500">{joinPresent([library.district, library.region], ", ")}</p>
                </div>
              </div>
              {library.description ? (
                <p className="mt-6 text-[15px] leading-relaxed text-zinc-700 whitespace-pre-line">{library.description}</p>
              ) : null}
              {contacts.length > 0 ? (
                <ul className="mt-6 flex flex-wrap gap-2" aria-label={t("contacts")}>
                  {contacts.map((contact) => (
                    <li key={contact.href}>
                      <a
                        href={contact.href}
                        target={contact.icon === "out" ? "_blank" : undefined}
                        rel={contact.icon === "out" ? "noopener" : undefined}
                        className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:border-forest-400 hover:text-forest-800"
                      >
                        {contact.icon === "phone" ? <Phone aria-hidden="true" className="h-3.5 w-3.5" /> : null}
                        {contact.label}
                        {contact.icon === "out" ? <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /> : null}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <dl className="lg:col-span-5 rounded-2xl border border-stone-200 bg-stone-50/80 p-6 space-y-5">
              {library.address ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{t("address")}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-zinc-700">{library.address}</dd>
                  {mapUrl ? (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-forest-700 hover:text-forest-800"
                    >
                      <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                      {t("map")}
                    </a>
                  ) : null}
                </div>
              ) : null}
              {library.hours ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{t("hours")}</dt>
                  <dd className="mt-1 text-sm text-zinc-700">{library.hours}</dd>
                </div>
              ) : null}
              {library.membership ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{t("membership")}</dt>
                  <dd className="mt-1 text-sm text-zinc-700">{library.membership}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {/* The books */}
          <section className="mt-14 sm:mt-20" aria-labelledby="library-books">
            <div className="mb-6 flex flex-col gap-4 border-b border-stone-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="library-books" className="font-serif text-2xl sm:text-3xl text-zinc-900">
                  {t("books")}
                </h2>
                {updated ? <p className="mt-1 text-xs text-zinc-500">{t("updated", { date: updated })}</p> : null}
              </div>
              {/* A plain GET form, so it works before any JavaScript does. */}
              <form action="" method="get" role="search" className="flex flex-wrap items-center gap-3">
                <label className="relative">
                  <span className="sr-only">{t("searchPlaceholder")}</span>
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder={t("searchPlaceholder")}
                    className="w-56 rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-forest-500 focus:outline-none"
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-zinc-600">
                  <input type="checkbox" name="available" value="1" defaultChecked={onlyAvailable} />
                  {t("onlyAvailable")}
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800"
                >
                  {t("search")}
                </button>
              </form>
            </div>

            {library.stale ? (
              <p className="mb-6 rounded-xl border border-stone-200 bg-stone-100 px-4 py-3 text-sm text-zinc-700">{t("stale")}</p>
            ) : null}

            {books.items.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {books.items.map(({ book, copiesAvailable }) => (
                    <div key={book.id} className="flex flex-col">
                      <BookCard book={book} />
                      <p className="mt-2 flex items-center gap-1.5 text-xs tabular-nums text-zinc-600">
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 rounded-full ${copiesAvailable > 0 ? "bg-forest-700" : "border border-stone-300"}`}
                        />
                        {copiesAvailable > 0 ? t("available", { count: copiesAvailable }) : t("allOut")}
                      </p>
                    </div>
                  ))}
                </div>
                <Pagination
                  currentPage={books.page}
                  totalPages={books.lastPage}
                  basePath={`/library/${slug}`}
                  query={{ q: q || undefined, available: onlyAvailable ? "1" : undefined }}
                />
              </>
            ) : (
              <p className="text-zinc-500">{t("noBooks")}</p>
            )}
          </section>
        </Container>
      </main>
    </>
  );
}
