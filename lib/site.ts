import { routing } from "@/i18n/routing";

/**
 * Absolute origin the public site is served from. Every canonical URL,
 * hreflang alternate, sitemap entry and og:image is built from this, so a
 * wrong value here silently mis-labels the whole site to search engines.
 *
 * Server-side only (no NEXT_PUBLIC_ prefix): metadata, robots.txt, the
 * sitemap and the OG images are all rendered on the server, so this is read
 * from the container's environment at runtime rather than baked into the
 * client bundle at build time.
 */
export const SITE_URL = (
  process.env.SITE_URL ?? "https://tarjima.kitoblarim.uz"
).replace(/\/$/, "");

export const SITE_NAME = process.env.SITE_NAME ?? "Reads";

export type Locale = (typeof routing.locales)[number];

/**
 * BCP 47 tags for hreflang and og:locale. The route segment is the short
 * form ("uz"); search engines want the regional tag, and Uzbek here means
 * the Latin script as written in Uzbekistan, not Cyrillic.
 */
export const HREFLANG: Record<Locale, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en",
};

export const OG_LOCALE: Record<Locale, string> = {
  uz: "uz_UZ",
  ru: "ru_RU",
  en: "en_US",
};

/** Absolute URL for a locale-prefixed path ("/translator/x" -> full URL). */
export function absoluteUrl(locale: Locale, path = ""): string {
  const suffix = path && !path.startsWith("/") ? `/${path}` : path;
  return `${SITE_URL}/${locale}${suffix}`;
}

/**
 * The `alternates` block every page needs: its own canonical URL plus one
 * hreflang entry per language, and x-default pointing at the site's default
 * language. Without this, three URLs carrying the same profile in different
 * languages compete with each other instead of reinforcing one another.
 */
export function localeAlternates(locale: Locale, path = "") {
  const languages: Record<string, string> = {};

  for (const other of routing.locales) {
    languages[HREFLANG[other]] = absoluteUrl(other, path);
  }

  languages["x-default"] = absoluteUrl(routing.defaultLocale, path);

  return {
    canonical: absoluteUrl(locale, path),
    languages,
  };
}
