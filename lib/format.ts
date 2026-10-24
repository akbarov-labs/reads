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
