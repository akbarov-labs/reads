import type { Book, Translator } from "@/lib/types";
import { publicAssetUrl } from "@/lib/api";
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
 * The catalogue's language names, as editions store them ("Rus tili",
 * "Oʻzbekcha", "Oʻzbek tili, Rus tili"), to the BCP 47 codes search engines
 * read. Keys are lower case, with any apostrophe as ' and no " tili".
 */
const LANGUAGE_CODES: Record<string, string> = {
  uz: "uz", "o'zbek": "uz", "o'zbekcha": "uz", "o'zbek (lotin)": "uz-Latn", "o'zbek (kirill)": "uz-Cyrl", uzbek: "uz", "узбекский": "uz",
  ru: "ru", rus: "ru", ruscha: "ru", russian: "ru", "русский": "ru",
  en: "en", ingliz: "en", inglizcha: "en", english: "en", "английский": "en",
  tr: "tr", turk: "tr", turkcha: "tr",
  az: "az", ozarbayjon: "az",
  kk: "kk", qozoq: "kk",
  ky: "ky", "qirg'iz": "ky",
  tk: "tk", turkman: "tk",
  tg: "tg", tojik: "tg",
  fa: "fa", fors: "fa",
  ar: "ar", arab: "ar",
  de: "de", nemis: "de",
  fr: "fr", fransuz: "fr",
  es: "es", ispan: "es",
  it: "it", italyan: "it",
  ja: "ja", yapon: "ja",
  ko: "ko", koreys: "ko",
  zh: "zh", xitoy: "zh",
};

/** BCP 47 codes for a catalogue language field, in order, once each. Names it doesn't know are left out, not guessed. */
export function languageCodes(field: string | null | undefined): string[] {
  const codes = (field ?? "")
    .split(",")
    .map((part) => LANGUAGE_CODES[part.trim().toLowerCase().replace(/[ʻʼ‘’`]/g, "'").replace(/\s+tili$/, "")])
    .filter((code): code is string => Boolean(code));
  return [...new Set(codes)];
}

/** One code as a string, several as a list, none as nothing. */
function inLanguage(codes: string[]): string | string[] | undefined {
  return codes.length > 1 ? codes : codes[0];
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

// ---------------------------------------------------------------------------
// The catalogue's own pages. Each graph names the page, the thing on it and
// the way back, cross-referenced by @id, with only facts the page shows.
// ---------------------------------------------------------------------------

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** Who publishes the catalogue: Kitoblarim, the same name as the Telegram bot. */
function organizationNode(): Node {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/apple-icon.png`,
    sameAs: ["https://t.me/kitob_javonim_bot"],
  };
}

function breadcrumbNode(locale: Locale, pageUrl: string, trail: { name: string; path: string }[]): Node {
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: absoluteUrl(locale, step.path),
    })),
  };
}

function pageNode(type: string, locale: Locale, url: string, name: string, about: string, description?: string): Node {
  return compact({
    "@type": type,
    "@id": url,
    url,
    name,
    description,
    inLanguage: HREFLANG[locale],
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": about },
    mainEntity: { "@id": about },
    breadcrumb: { "@id": `${url}#breadcrumb` },
  });
}

/**
 * The home page's graph: the site, its publisher, and the search box an
 * answer engine or Google can hand a query to (the books listing's ?q=).
 */
export function siteGraph({ locale, name, description }: { locale: Locale; name: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name,
        description,
        inLanguage: routing.locales.map((code) => HREFLANG[code]),
        publisher: { "@id": ORGANIZATION_ID },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl(locale, "/books")}?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

type BookPageInput = {
  book: import("@/lib/types").BookWithTranslator;
  locale: Locale;
  path: string;
  description: string;
  trail: { name: string; path: string }[];
};

/**
 * One book's page: the work, every printing of it with its ISBN, who wrote,
 * translated and published it, critics' reviews (taqrizlar, scored out of
 * 10) and Kitoblarim readers' rating and reviews (out of 5). A rating only
 * appears when readers gave one: an empty aggregate is a false claim.
 */
export function bookPageGraph({ book, locale, path, description, trail }: BookPageInput) {
  const url = absoluteUrl(locale, path);
  const bookId = `${url}#book`;
  const editions = book.editions ?? [];
  const firstIsbn = editions.find((edition) => edition.isbn)?.isbn;
  const authors = (book.authors ?? []).map((author) => ({
    "@type": "Person",
    name: author.name,
    url: absoluteUrl(locale, `/author/${author.slug}`),
  }));
  const translators = new Map<string, Node>();
  for (const edition of editions) {
    for (const credit of edition.translators) {
      if ((credit.role ?? "translator") !== "translator") continue;
      translators.set(credit.slug, { "@type": "Person", name: credit.name, url: absoluteUrl(locale, `/translator/${credit.slug}`) });
    }
  }

  const reviews: Node[] = [
    ...(book.taqrizlar ?? []).map((taqriz) =>
      compact({
        "@type": "Review",
        url: absoluteUrl(locale, `/taqriz/${taqriz.id}`),
        author: taqriz.taqrizchi ? { "@type": "Person", name: taqriz.taqrizchi.name } : undefined,
        datePublished: taqriz.createdAt ?? undefined,
        reviewBody: taqriz.body,
        reviewRating:
          taqriz.averageScore != null
            ? { "@type": "Rating", ratingValue: taqriz.averageScore, bestRating: 10, worstRating: 0 }
            : undefined,
      }),
    ),
    ...(book.readerReviews ?? []).map((review) =>
      compact({
        "@type": "Review",
        author: { "@type": "Person", name: review.authorName || "Kitoblarim" },
        datePublished: review.writtenAt ?? undefined,
        reviewBody: review.body,
        reviewRating: review.rating ? { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 } : undefined,
      }),
    ),
  ];

  const bookNodeFull = compact({
    "@type": "Book",
    "@id": bookId,
    url,
    name: book.uzbekTitle,
    alternateName: book.originalTitle && book.originalTitle !== book.uzbekTitle ? book.originalTitle : undefined,
    description: book.description ?? undefined,
    image: publicAssetUrl(book.coverUrl),
    // The languages its printings are in. A third of the catalogue is
    // Russian and a sixth English, so "Uzbek" can't be assumed here.
    inLanguage: inLanguage([...new Set(editions.flatMap((edition) => languageCodes(edition.language)))]),
    isbn: firstIsbn ?? undefined,
    author: authors.length ? authors : book.author ? { "@type": "Person", name: book.author } : undefined,
    translator: translators.size ? [...translators.values()] : undefined,
    genre: book.categories?.map((category) => category.name),
    translationOfWork:
      translators.size && book.originalTitle
        ? compact({ "@type": "Book", name: book.originalTitle, inLanguage: language(book.sourceLanguage) })
        : undefined,
    workExample: editions.map((edition) =>
      compact({
        "@type": "Book",
        name: edition.title || book.uzbekTitle,
        isbn: edition.isbn ?? undefined,
        bookEdition: edition.year ? String(edition.year) : undefined,
        datePublished: edition.year ? String(edition.year) : undefined,
        numberOfPages: edition.pages ?? undefined,
        publisher: edition.publisher ? { "@type": "Organization", name: edition.publisher.name } : undefined,
        inLanguage: inLanguage(languageCodes(edition.language)),
      }),
    ),
    aggregateRating:
      book.readerRating && book.readerRating.count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: book.readerRating.average,
            ratingCount: book.readerRating.count,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    review: reviews,
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      pageNode("ItemPage", locale, url, book.uzbekTitle, bookId, description),
      bookNodeFull,
      breadcrumbNode(locale, url, trail),
    ],
  };
}

/** An author's page: the person, and the way back. */
export function authorPageGraph({
  author,
  locale,
  path,
  trail,
}: {
  author: import("@/lib/types").Author;
  locale: Locale;
  path: string;
  trail: { name: string; path: string }[];
}) {
  const url = absoluteUrl(locale, path);
  const personId = `${url}#person`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      pageNode("ProfilePage", locale, url, author.name, personId),
      compact({
        "@type": "Person",
        "@id": personId,
        url,
        name: author.name,
        alternateName: author.originalName && author.originalName !== author.name ? author.originalName : undefined,
        description: author.bio ?? undefined,
        nationality: author.nationality ?? undefined,
        birthDate: author.birthYear ? String(author.birthYear) : undefined,
        deathDate: author.deathYear ? String(author.deathYear) : undefined,
        image: publicAssetUrl(author.portraitUrl || author.imageUrl),
        sameAs: safeExternalUrl(author.websiteUrl) ?? undefined,
      }),
      breadcrumbNode(locale, url, trail),
    ],
  };
}

/** A publisher's page: the organization, and the way back. */
export function publisherPageGraph({
  publisher,
  locale,
  path,
  trail,
}: {
  publisher: import("@/lib/types").Publisher;
  locale: Locale;
  path: string;
  trail: { name: string; path: string }[];
}) {
  const url = absoluteUrl(locale, path);
  const orgId = `${url}#publisher`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      pageNode("ProfilePage", locale, url, publisher.name, orgId),
      compact({
        "@type": "Organization",
        "@id": orgId,
        url,
        name: publisher.name,
        description: publisher.bio ?? undefined,
        foundingDate: publisher.establishedYear ? String(publisher.establishedYear) : undefined,
        logo: publicAssetUrl(publisher.logoUrl),
        sameAs: safeExternalUrl(publisher.websiteUrl) ?? undefined,
      }),
      breadcrumbNode(locale, url, trail),
    ],
  };
}

/**
 * A library's page: a schema.org Library (a LocalBusiness) with its
 * address and phone, so "kutubxona
 * Shayxontohur" can find it.
 */
export function libraryPageGraph({
  library,
  locale,
  path,
  trail,
}: {
  library: import("@/lib/types").Library;
  locale: Locale;
  path: string;
  trail: { name: string; path: string }[];
}) {
  const url = absoluteUrl(locale, path);
  const libraryId = `${url}#library`;
  const sameAs = [library.telegramUrl, library.instagramUrl, library.websiteUrl]
    .map((link) => safeExternalUrl(link))
    .filter((link): link is string => Boolean(link));

  return {
    "@context": "https://schema.org",
    "@graph": [
      pageNode("WebPage", locale, url, library.name, libraryId),
      compact({
        "@type": "Library",
        "@id": libraryId,
        url,
        name: library.name,
        description: library.description ?? undefined,
        image: publicAssetUrl(library.photoUrl),
        telephone: library.phone ?? undefined,
        address: compact({
          "@type": "PostalAddress",
          streetAddress: library.address ?? undefined,
          addressLocality: library.district ?? undefined,
          addressRegion: library.region,
          addressCountry: "UZ",
        }),
        geo:
          library.latitude != null && library.longitude != null
            ? { "@type": "GeoCoordinates", latitude: library.latitude, longitude: library.longitude }
            : undefined,
        sameAs: sameAs.length > 0 ? sameAs : undefined,
      }),
      breadcrumbNode(locale, url, trail),
    ],
  };
}
