import { clientIp } from "@/lib/clientIp";
import { resolveAssetUrl } from "@/lib/api";
import { EMPTY_RESULTS, normalizeQuery, type SearchResults } from "@/lib/search";
import { searchCache } from "@/lib/searchCache";

/**
 * The search box asks here, on the site's own origin, and this asks
 * Reads-admin's GET /api/search over the internal network, as the inquiry
 * form's route does.
 *
 * No bearer token on purpose: with it, every visitor's keystrokes would
 * share the site's one bucket on the admin, the one page renders need.
 * Without it, and with the visitor's address forwarded, each reader gets a
 * stranger's 120 a minute of their own.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.API_URL ?? "http://localhost:8000/api";

/** Per group; the box has room for about this many before it scrolls. */
const PER_GROUP = 5;

type Group<T> = { items: T[]; total: number };
type Person = { slug: string; name: string; bookCount: number };

/** What Reads-admin sends: each kind names its picture differently. */
interface UpstreamResults {
  books: Group<SearchResults["books"]["items"][number]>;
  authors: Group<Person & { portraitUrl: string | null }>;
  translators: Group<Person & { avatarUrl: string | null }>;
  publishers: Group<Person & { logoUrl: string | null }>;
}

const image = (path: string | null | undefined) => resolveAssetUrl(path) || null;

function person<T extends Person>(group: Group<T> | undefined, picture: (item: T) => string | null) {
  return {
    items: (group?.items ?? []).map((item) => ({
      slug: item.slug,
      name: item.name,
      imageUrl: image(picture(item)),
      bookCount: item.bookCount,
    })),
    total: group?.total ?? 0,
  };
}

/** Image paths as next/image can fetch them, and one picture field for every kind of person. */
function toResults(upstream: UpstreamResults): SearchResults {
  return {
    books: {
      items: (upstream.books?.items ?? []).map((book) => ({ ...book, coverUrl: image(book.coverUrl) })),
      total: upstream.books?.total ?? 0,
    },
    authors: person(upstream.authors, (a) => a.portraitUrl),
    translators: person(upstream.translators, (t) => t.avatarUrl),
    publishers: person(upstream.publishers, (p) => p.logoUrl),
  };
}

function json(body: unknown, status: number, cacheable = false) {
  return Response.json(body, {
    status,
    // Lets the browser answer a backspace from its own cache. Private, so
    // Cloudflare does not keep it.
    headers: cacheable ? { "Cache-Control": "private, max-age=60" } : { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const query = normalizeQuery(new URL(request.url).searchParams.get("q") ?? "");

  if (!query) {
    return json(EMPTY_RESULTS, 200, true);
  }

  const cached = searchCache.get(query);
  if (cached) {
    return json(cached, 200, true);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  const ip = clientIp(request);

  if (ip) headers["X-Forwarded-For"] = ip;

  let upstream: Response;

  try {
    upstream = await fetch(`${API_URL}/search?${new URLSearchParams({ q: query, limit: String(PER_GROUP) })}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return json({ message: "Search is unreachable." }, 502);
  }

  // A 429 goes back as one, so the box can wait instead of retrying.
  if (!upstream.ok) {
    return json({ message: "Search failed." }, upstream.status === 429 ? 429 : 502);
  }

  const results = toResults((await upstream.json()) as UpstreamResults);
  searchCache.set(query, results);

  return json(results, 200, true);
}
