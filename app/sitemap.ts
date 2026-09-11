import type { MetadataRoute } from "next";
import { getTranslators } from "@/lib/api";
import { routing } from "@/i18n/routing";
import { HREFLANG, absoluteUrl, type Locale } from "@/lib/site";

/**
 * Built from the live API, not from a checked-in list, so a translator added
 * in the admin panel appears here without a deploy. The fetch behind
 * getTranslators is cache-tagged, and Reads-admin drops that tag on every
 * write — which is why a book added at 10:00 is in this file at 10:00.
 */
export const revalidate = 300;

function alternates(path = "") {
  const languages: Record<string, string> = {};

  for (const locale of routing.locales) {
    languages[HREFLANG[locale]] = absoluteUrl(locale, path);
  }

  // Mirrors the x-default <link> on the pages themselves. A sitemap that
  // disagrees with the page's own hreflang set is a signal Google resolves
  // by ignoring both.
  languages["x-default"] = absoluteUrl(routing.defaultLocale, path);

  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const translators = await getTranslators(routing.defaultLocale);

  // A profile marked "hide from search engines" in the admin panel carries
  // noindex on the page itself; listing it here would be the sitemap telling
  // Google to go and read a page that then refuses to be indexed.
  const indexable = translators.filter((translator) => !translator.seo?.noindex);

  const newest = indexable
    .map((translator) => translator.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  const home: MetadataRoute.Sitemap = routing.locales.map((locale: Locale) => ({
    url: absoluteUrl(locale),
    lastModified: newest ? new Date(newest) : new Date(),
    changeFrequency: "weekly",
    priority: 1,
    alternates: alternates(),
  }));

  const profiles: MetadataRoute.Sitemap = indexable.flatMap((translator) => {
    const path = `/translator/${translator.slug}`;

    return routing.locales.map((locale: Locale) => ({
      url: absoluteUrl(locale, path),
      lastModified: translator.updatedAt
        ? new Date(translator.updatedAt)
        : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: alternates(path),
    }));
  });

  return [...home, ...profiles];
}
