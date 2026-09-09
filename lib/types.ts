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
}
