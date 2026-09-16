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

export interface Book {
  id: string;
  role?: "author" | "translator" | "editor";
  uzbekTitle: string;
  originalTitle: string;
  author: string;
  /** Portrait photo of the author, relative URL resolved by api.ts. */
  authorImageUrl?: string | null;
  sourceLanguage: string;
  publisher: string;
  /** Logo or representative image for the publisher, relative URL resolved by api.ts. */
  publisherImageUrl?: string | null;
  year: number;
  coverUrl: string;
  excerpt?: Excerpt;
}

/**
 * A book enriched with the translator it belongs to, for use in flat
 * cross-translator listing pages (Books, Authors, Publishers discovery).
 */
export interface BookWithTranslator extends Book {
  translatorSlug: string;
  translatorName: string;
}

/**
 * A unique author derived from the books collection.
 * The backend stores author as a plain string per book; we aggregate here.
 */
export interface Author {
  slug: string;
  name: string;
  /** Best available photo — taken from the first book that has one. */
  imageUrl?: string | null;
  /** Number of books attributed to this author in the database. */
  bookCount: number;
  /** Books by this author, for preview thumbnails. */
  books: BookWithTranslator[];
}

/**
 * A unique publisher derived from the books collection.
 */
export interface Publisher {
  slug: string;
  name: string;
  /** Logo or representative image — taken from the first book that has one. */
  imageUrl?: string | null;
  bookCount: number;
  books: BookWithTranslator[];
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
