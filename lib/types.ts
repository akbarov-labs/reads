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
  sourceLanguage: string;
  publisher: string;
  year: number;
  coverUrl: string;
  excerpt?: Excerpt;
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
