import type { SearchResults } from "@/lib/search";

/**
 * Recent answers from Reads-admin's /api/search, kept in this process for a
 * minute. Readers type the same few prefixes ("ot", "otk", "otka"…), and
 * every hit here is a request that neither waits on the admin nor counts
 * against the visitor's rate limit there.
 *
 * In memory, not the fetch cache: that keys on the request headers too,
 * and each request carries its visitor's address. One container, a few
 * hundred small entries; nothing is lost but a minute's freshness on a
 * restart.
 */
const TTL_MS = 60_000;
const MAX_ENTRIES = 500;

const entries = new Map<string, { results: SearchResults; expires: number }>();

export const searchCache = {
  get(key: string, now = Date.now()): SearchResults | undefined {
    const entry = entries.get(key);

    if (!entry) return undefined;
    if (entry.expires <= now) {
      entries.delete(key);
      return undefined;
    }

    return entry.results;
  },

  set(key: string, results: SearchResults, now = Date.now()): void {
    // A Map iterates in insertion order, so the first key is the oldest.
    entries.delete(key);
    if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value!);
    entries.set(key, { results, expires: now + TTL_MS });
  },

  clear(): void {
    entries.clear();
  },

  get size(): number {
    return entries.size;
  },
};
