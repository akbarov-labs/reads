type Part = string | number | null | undefined | false;

/**
 * The parts that have a value, joined: "Sharq · 2015", or "2015" alone.
 * Null when none do, so the caller renders no line at all rather than an
 * empty one or a lone separator. Zero counts as missing: the API sends 0
 * for a year or a page count nobody entered.
 */
export function joinPresent(parts: Part[], separator = " · "): string | null {
  const present = parts
    .map((part) => (typeof part === "string" ? part.trim() : part))
    .filter((part): part is string | number => part !== null && part !== undefined && part !== false && part !== "" && part !== 0);

  return present.length > 0 ? present.join(separator) : null;
}

const MONTHS_UZ = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];

/**
 * "24-oktabr", "24 октября", "24 October": a day a reader can trust
 * without knowing when the page was cached, which "2 days ago" is not.
 * Uzbek is spelled out by hand: Node's ICU names months in Uzbek
 * inconsistently across versions.
 */
export function shortDate(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  if (locale === "uz") {
    // Tashkent is UTC+5 all year, with no daylight saving.
    const tashkent = new Date(date.getTime() + 5 * 60 * 60 * 1000);
    return `${tashkent.getUTCDate()}-${MONTHS_UZ[tashkent.getUTCMonth()]}`;
  }

  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Tashkent",
  }).format(date);
}
