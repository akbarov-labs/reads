import type { Book, Translator } from "@/lib/types";
import { HREFLANG, SITE_NAME, SITE_URL, absoluteUrl, type Locale } from "@/lib/site";
import { routing } from "@/i18n/routing";
import { safeExternalUrl } from "@/lib/safeUrl";

type Node = Record<string, unknown>;

/**
 * A raster image URL a crawler can actually fetch. Mirrors ogImage() in
 * lib/seo.ts so the graph and the Open Graph tags never disagree about what
 * this person looks like.
 */
function profileImage(translator: Translator, locale: Locale): string {
  const uploaded = translator.seo?.ogImageUrl;

  return uploaded && !/\.svg(\?|$)/i.test(uploaded)
    ? uploaded
    : `${SITE_URL}/og/${locale}/${encodeURIComponent(translator.slug)}`;
}

/**
 * Drops keys whose value is empty, so an incomplete profile produces a
 * smaller graph rather than one full of nulls — a `"datePublished": null`
 * is worse than no datePublished at all, because validators flag it.
 */
function compact(node: Node): Node {
  return Object.fromEntries(
    Object.entries(node).filter(([, value]) => {
      if (value === null || value === undefined || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  );
}

function language(name: string | null | undefined) {
  return name ? { "@type": "Language", name } : undefined;
}

/**
 * One book, expressed from the translator's point of view. The role decides
 * which credit the person gets — translating a novel and writing one are
 * different claims, and an answer engine that conflates them will attribute
 * someone else's book to this person.
 */
/**
 * The language a *book* is written in — which is not the language the page
 * happens to be displayed in. These editions are Uzbek: the model's title
 * field is literally `uzbekTitle`, and every language pair on the site runs
 * into Uzbek. Tagging a Russian-language view of the page as "these books
 * are in Russian" would be a plain factual error, and structured data that
 * contradicts the page is worse than none.
 */
const BOOK_LANGUAGE = HREFLANG[routing.defaultLocale];

function bookNode(book: Book, personId: string): Node {
  const credit =
    book.role === "author"
      ? { author: { "@id": personId } }
      : book.role === "editor"
        ? { editor: { "@id": personId } }
        : { translator: { "@id": personId } };

  // For a translation the original is a separate work, and saying so is
  // what lets a search engine connect this edition to the source book
  // instead of treating them as unrelated titles.
  const original =
    book.role === "translator" && book.originalTitle
      ? {
          translationOfWork: compact({
            "@type": "Book",
            name: book.originalTitle,
            inLanguage: language(book.sourceLanguage),
            author: book.author
              ? { "@type": "Person", name: book.author }
              : undefined,
          }),
        }
      : {};

  return compact({
    "@type": "Book",
    name: book.uzbekTitle,
    alternateName:
      book.originalTitle !== book.uzbekTitle ? book.originalTitle : undefined,
    inLanguage: BOOK_LANGUAGE,
    datePublished: book.year ? String(book.year) : undefined,
    publisher: book.publisher
      ? { "@type": "Organization", name: book.publisher }
      : undefined,
    author:
      book.role !== "author" && book.author
        ? { "@type": "Person", name: book.author }
        : undefined,
    abstract: book.excerpt?.translatedText,
    ...credit,
    ...original,
  });
}

/**
 * The full structured-data graph for a profile page.
 *
 * Everything is cross-referenced by @id — the page points at the person, the
 * person points at their books, the breadcrumb points back at the page — so
 * a crawler reads one connected description of "who this is and what they
 * translated" rather than four unrelated fragments. That connectedness is
 * what answer engines quote from.
 */
export function translatorGraph({
  translator,
  locale,
  path = "",
  breadcrumb,
}: {
  translator: Translator;
  locale: Locale;
  path?: string;
  breadcrumb?: { home: string; current: string };
}): Node {
  const pageUrl = absoluteUrl(locale, path);
  const personId = `${pageUrl}#person`;
  const siteId = `${SITE_URL}/#website`;

  const knowsLanguage = Array.from(
    new Set(
      translator.languagePairs.flatMap((pair) => [pair.from, pair.to]),
    ),
  )
    .map((name) => language(name))
    .filter(Boolean);

  const person = compact({
    "@type": "Person",
    "@id": personId,
    name: translator.name,
    url: pageUrl,
    jobTitle: translator.title || undefined,
    description: translator.seo?.metaDescription || translator.bio || undefined,
    // Same rule as og:image: an SVG avatar is not something a crawler's
    // image pipeline can use, so fall through to the generated card.
    image: profileImage(translator, locale),
    address: translator.location
      ? { "@type": "PostalAddress", addressLocality: translator.location }
      : undefined,
    knowsLanguage,
    // Only well-formed http(s) links: a malformed or hostile URL in sameAs
    // taints the whole graph for the crawler that reads it.
    sameAs: translator.socialLinks
      .map((link) => safeExternalUrl(link.url))
      .filter((url): url is string => url !== null),
    knowsAbout: translator.books
      .map((book) => book.originalTitle)
      .filter(Boolean)
      .slice(0, 12),
  });

  const books = translator.books.map((book) => bookNode(book, personId));

  const graph: Node[] = [
    compact({
      "@type": "WebSite",
      "@id": siteId,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: HREFLANG[locale],
    }),
    compact({
      "@type": "ProfilePage",
      "@id": pageUrl,
      url: pageUrl,
      name: translator.seo?.metaTitle || translator.name,
      description: translator.seo?.metaDescription || translator.bio,
      inLanguage: HREFLANG[locale],
      isPartOf: { "@id": siteId },
      about: { "@id": personId },
      mainEntity: { "@id": personId },
      dateModified: translator.updatedAt || undefined,
    }),
    person,
    ...books,
  ];

  if (breadcrumb) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: breadcrumb.home,
          item: absoluteUrl(locale),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: breadcrumb.current,
          item: pageUrl,
        },
      ],
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
