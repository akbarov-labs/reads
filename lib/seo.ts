import type { Metadata } from "next";
import type { Translator } from "@/lib/types";
import {
  HREFLANG,
  OG_LOCALE,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  localeAlternates,
  type Locale,
} from "@/lib/site";

/**
 * Where a profile's social-preview image comes from. An admin-uploaded image
 * wins; otherwise the site renders one on demand from the live profile, so
 * the card reflects the current book count without anyone maintaining it.
 *
 * The generated route takes only a locale and a slug — never free text — so
 * it cannot be turned into an image generator for someone else's wording.
 */
function ogImage(locale: Locale, translator: Translator) {
  const override = translator.seo?.ogImageUrl;

  // A vector avatar renders fine in the page but is useless as a share
  // image: Telegram, X and Facebook all refuse image/svg+xml. Fall through
  // to the generated card in that case.
  const usable = override && !/\.svg(\?|$)/i.test(override) ? override : null;

  return {
    url:
      usable ??
      `${SITE_URL}/og/${locale}/${encodeURIComponent(translator.slug)}`,
    width: 1200,
    height: 630,
    alt: translator.seo?.metaTitle ?? translator.name,
  };
}

/**
 * Metadata for a page that shows one translator (the home page and the
 * /translator/[slug] page both do).
 *
 * Title and description come from the API already resolved — see the `seo`
 * block in Reads-admin's TranslatorResource. The `fallback` argument only
 * covers an API old enough not to send that block.
 */
export function translatorMetadata({
  translator,
  locale,
  path = "",
  fallback,
}: {
  translator: Translator;
  locale: Locale;
  path?: string;
  fallback: { title: string; description: string };
}): Metadata {
  const title = translator.seo?.metaTitle || fallback.title;
  const description = translator.seo?.metaDescription || fallback.description;
  const url = absoluteUrl(locale, path);
  const image = ogImage(locale, translator);
  const noindex = translator.seo?.noindex ?? false;

  return {
    // `absolute` opts out of the layout's "%s · Reads" template. The API
    // already resolved a complete title (and an admin may have written it by
    // hand), so appending a suffix would both double the branding and make
    // the panel's preview a lie about what search engines see.
    title: { absolute: title },
    description,
    alternates: localeAlternates(locale, path),
    robots: noindex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            // Let Google use full-size previews and untruncated snippets —
            // the default caps both, which costs click-through for nothing.
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type: "profile",
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: OG_LOCALE[locale],
      alternateLocale: Object.entries(OG_LOCALE)
        .filter(([other]) => other !== locale)
        .map(([, tag]) => tag),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
    other: {
      // Read by some answer engines and by Telegram's link preview.
      "og:profile:username": translator.slug,
    },
  };
}

/** hreflang tag for a locale, exposed for the sitemap's alternates block. */
export function hreflangFor(locale: Locale): string {
  return HREFLANG[locale];
}
