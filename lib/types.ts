export interface LanguagePair {
  from: string;
  to: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface Excerpt {
  sourceLanguage: string;
  sourceText: string;
  translatedText: string;
}

export type CreditRole = "author" | "translator" | "editor";

/** Someone credited on an edition, and for what. */
export interface Credit {
  slug: string;
  name: string;
  role?: CreditRole | null;
}

export interface AuthorRef {
  id: string;
  slug: string;
  name: string;
}

export interface CategoryRef {
  slug: string;
  name: string;
  isPrimary?: boolean;
}

/**
 * A book as a card: the work, with the cover, publisher, year and
 * translator of its primary edition flattened in. On a translator's profile
 * each entry is instead one edition they worked on (see `editionId`).
 */
export interface Book {
  id: string;
  /** Set on translator-profile entries: the edition this card stands for. */
  editionId?: string | null;
  authorId?: string | null;
  role?: CreditRole | null;
  uzbekTitle: string;
  originalTitle?: string | null;
  /** Every author's name, comma-separated. */
  author: string;
  authors?: AuthorRef[];
  /** Portrait photo of the first author, relative URL resolved by api.ts. */
  authorImageUrl?: string | null;
  sourceLanguage?: string | null;
  publisher: string;
  publisherSlug?: string | null;
  /** Logo or representative image for the publisher, relative URL resolved by api.ts. */
  publisherImageUrl?: string | null;
  year?: number | null;
  coverUrl: string;
  excerpt?: Excerpt | null;
  translators?: Credit[];
  categories?: CategoryRef[];
  series?: { slug: string; name: string; position?: number | null } | null;
  /** How many published editions the book has; the card shows one. */
  editionCount?: number;
}

/** One printing of a book: this publisher, this ISBN, these translators. */
export interface Edition {
  id: string;
  title?: string | null;
  isbn?: string | null;
  publisher?: { slug: string; name: string; logoUrl?: string | null } | null;
  translators: Credit[];
  year?: number | null;
  language?: string | null;
  script?: string | null;
  pages?: number | null;
  coverType?: string | null;
  coverMaterial?: string | null;
  paperFormat?: string | null;
  pageSurface?: string | null;
  printCountry?: string | null;
  weight?: string | null;
  dimensions?: string | null;
  volumeCount?: number | null;
  volumePart?: number | null;
  coverUrl: string;
  images?: string[];
  description?: string | null;
  excerpt?: Excerpt | null;
}

/** One page of a paginated API listing. */
export interface Paginated<T> {
  items: T[];
  page: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export interface Category {
  slug: string;
  name: string;
  bookCount: number;
  children: Category[];
}

/**
 * A book enriched with the translator it belongs to, for use in flat
 * cross-translator listing pages (Books, Authors, Publishers discovery).
 *
 * The translator fields are optional because a book no longer belongs to a
 * translator: the catalogue endpoint returns books in their own right, and a
 * book can reach the site without anyone having translated it yet (a reviewer
 * adding a book they want to write about, an original-language work). Callers
 * must treat "no translator" as a normal state, not a data error.
 */
export interface BookWithTranslator extends Book {
  translatorSlug?: string | null;
  translatorName?: string | null;
  /** Approved reviews of this book. Absent on endpoints that don't load them. */
  taqrizlar?: Taqriz[];
  /** Mean of each review's own average, or null when there are none. */
  averageScore?: number | null;
  /** Book page only: the work's own description. */
  description?: string | null;
  /** Book page only: every published edition. */
  editions?: Edition[];
  /** Book page only: what to read next, strongest signal first. */
  relatedBooks?: BookWithTranslator[];
}

/** A catalogue author, as /api/authors serves them. */
export interface Author {
  id?: string;
  slug: string;
  name: string;
  /** The name in its own script, e.g. "Абдулла Қодирий". */
  originalName?: string | null;
  bio?: string | null;
  nationality?: string | null;
  birthYear?: number | null;
  deathYear?: number | null;
  portraitUrl?: string | null;
  imageUrl?: string | null;
  websiteUrl?: string | null;
  bookCount: number;
  /** A few recent covers, for the card. */
  coverUrls?: string[];
}

/** A catalogue publisher, as /api/publishers serves them. */
export interface Publisher {
  id?: string;
  slug: string;
  name: string;
  bio?: string | null;
  country?: string | null;
  establishedYear?: number | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  websiteUrl?: string | null;
  bookCount: number;
  /** A few recent covers, for the card. */
  coverUrls?: string[];
}

/**
 * Search-engine metadata, already resolved by Reads-admin: an admin's
 * override where one exists, otherwise a value derived from the profile
 * (name, professional title, location, language pairs, live book count).
 * The site renders these verbatim — the admin panel previews the exact
 * strings, and a new book changes the description without anyone editing it.
 *
 * Managed by admins only; translators cannot see or write these fields.
 */
export interface TranslatorSeo {
  metaTitle: string;
  metaDescription: string;
  /** Absolute, publicly reachable URL (unlike avatarUrl/coverUrl). */
  ogImageUrl: string | null;
  noindex: boolean;
}

export interface Translator {
  slug: string;
  name: string;
  /** Translator-set professional title (e.g. "Translator & Author"), in
   * whichever site language was requested. Falls back to a generic site
   * default when the translator hasn't set one — see SiteHeader usage. */
  title?: string | null;
  avatarUrl: string;
  location: string;
  bio: string;
  languagePairs: LanguagePair[];
  socialLinks: SocialLink[];
  yearsActive: number;
  startYear: number;
  totalBooksTranslated: number;
  books: Book[];
  /** Newest change anywhere in the profile, including its books. Sitemap lastmod. */
  updatedAt?: string | null;
  /** Optional so an older API deployment doesn't break rendering. */
  seo?: TranslatorSeo | null;
}

/**
 * The five aspects a taqriz can score, keyed the way the API emits them (the
 * storage prefix is stripped server-side). Every one is optional: an absent
 * key means "not rated", which is different from a score of zero and has to
 * stay distinguishable.
 *
 * `translation` is absent for a book nobody has translated — there is no
 * translation to judge — which is why the overall figure averages the keys
 * that are present rather than dividing by five.
 */
export interface AspectScores {
  plot?: number;
  style?: number;
  translation?: number;
  cover?: number;
  overall?: number;
}

/** The order the aspects are shown in, matching the admin form. */
export const ASPECT_KEYS = [
  "plot",
  "style",
  "translation",
  "cover",
  "overall",
] as const satisfies readonly (keyof AspectScores)[];

export type AspectKey = (typeof ASPECT_KEYS)[number];

/** One review, as it appears on a book page, a profile, or its own permalink. */
export interface Taqriz {
  id: string;
  body: string;
  youtubeUrl?: string | null;
  scores: AspectScores;
  /** Average of the aspects actually scored, or null when none were. */
  averageScore?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** Present when the taqriz is rendered away from its author's page. */
  taqrizchi?: {
    slug: string;
    name: string;
    avatarUrl?: string | null;
  } | null;
  /** Present when the taqriz is rendered away from the book's page. */
  book?: {
    id: string;
    uzbekTitle: string;
    author: string;
    coverUrl?: string | null;
  } | null;
  /** The edition the reviewer read — its translation and printing are what was scored. */
  edition?: {
    id: string;
    title?: string | null;
    publisher?: string | null;
    year?: number | null;
    translators: { slug: string; name: string }[];
  } | null;
}

/**
 * A book reviewer. Deliberately the same shape as Translator where the two
 * overlap, so the profile components can render either.
 */
export interface Taqrizchi {
  slug: string;
  name: string;
  title?: string | null;
  avatarUrl: string;
  location?: string | null;
  bio?: string | null;
  socialLinks: SocialLink[];
  /** Approved reviews only — a pending one must not show up even as a count. */
  totalTaqrizlar: number;
  taqrizlar: Taqriz[];
  updatedAt?: string | null;
}
