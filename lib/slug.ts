/**
 * Generates URL-safe slugs from titles or names, with special support for
 * Uzbek specific characters (o', g', sh, ch, etc.) and diacritics.
 */
export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    // normalize Uzbek letter variants
    .replace(/[ʻʼ'`]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
