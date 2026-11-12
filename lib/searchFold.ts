/**
 * Text folded for matching a name typed by hand: lower case, Cyrillic
 * spelled in Uzbek Latin, apostrophes dropped. The same idea as reads-admin's
 * search_key (UzbekText::searchKey), for the few lists the site filters
 * itself, such as the translators.
 */
const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ғ: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z",
  и: "i", й: "y", к: "k", қ: "q", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ў: "o", ф: "f", х: "x", ҳ: "h", ц: "s", ч: "ch", ш: "sh",
  щ: "sh", ъ: "", ь: "", ы: "i", э: "e", ю: "yu", я: "ya",
};

export function foldForSearch(text: string): string {
  return [...text.toLowerCase()]
    .map((char) => CYRILLIC[char] ?? char)
    .join("")
    .replace(/[ʻʼ'‘’`´]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Every word of the query starts a word of the name, in any order. */
export function matchesSearch(name: string, query: string): boolean {
  const words = foldForSearch(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = ` ${foldForSearch(name)}`;
  return words.every((word) => haystack.includes(` ${word}`));
}
