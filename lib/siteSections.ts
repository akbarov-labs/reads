/**
 * The catalogue's main sections, in the header's order. `detail` is the path
 * of one entry in the section, so a book's page still shows "Kitoblar" as
 * where the reader is. `labelKey` is the section's name in the `home` messages.
 */
export const SITE_SECTIONS = [
  { href: "/books", detail: "/book", labelKey: "statBooks" },
  { href: "/authors", detail: "/author", labelKey: "statAuthors" },
  { href: "/translators", detail: "/translator", labelKey: "statTranslators" },
  { href: "/publishers", detail: "/publisher", labelKey: "statPublishers" },
  { href: "/chegirmalar", detail: "/chegirmalar", labelKey: "navDeals" },
] as const;

export type SiteSection = (typeof SITE_SECTIONS)[number];

/** Whether a locale-free pathname is this section's list or one of its entries. */
export function isInSection(pathname: string, section: SiteSection): boolean {
  return (
    pathname === section.href ||
    pathname.startsWith(`${section.href}/`) ||
    pathname.startsWith(`${section.detail}/`)
  );
}
