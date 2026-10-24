import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/search/route";
import { EMPTY_RESULTS } from "@/lib/search";
import { searchCache } from "@/lib/searchCache";

// vitest.config.ts pins API_URL to the production Docker address.
const UPSTREAM = "http://reads-admin-app/api/search";

const upstreamBody = {
  books: {
    items: [{ id: "12", uzbekTitle: "Oʻtkan kunlar", originalTitle: null, author: "Abdulla Qodiriy", year: 2019, coverUrl: "/storage/covers/12.jpg" }],
    total: 1,
  },
  authors: { items: [{ slug: "abdulla-qodiriy", name: "Abdulla Qodiriy", originalName: null, portraitUrl: "/storage/a.jpg", bookCount: 7 }], total: 1 },
  translators: { items: [{ slug: "ali", name: "Ali", avatarUrl: null, bookCount: 2 }], total: 1 },
  publishers: { items: [{ slug: "sharq", name: "Sharq", logoUrl: "/storage/sharq.png", bookCount: 1 }], total: 1 },
};

function search(q: string, headers: Record<string, string> = {}) {
  return GET(new Request(`https://kitoblarim.uz/api/search?${new URLSearchParams({ q })}`, { headers }));
}

describe("GET /api/search", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    searchCache.clear();
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("asks Reads-admin for the top five of each kind and hands back one shape for every person", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(upstreamBody));

    const response = await search("Otkan");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${UPSTREAM}?q=otkan&limit=5`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      books: { items: [{ ...upstreamBody.books.items[0], coverUrl: "http://reads-admin-app/storage/covers/12.jpg" }], total: 1 },
      authors: { items: [{ slug: "abdulla-qodiriy", name: "Abdulla Qodiriy", imageUrl: "http://reads-admin-app/storage/a.jpg", bookCount: 7 }], total: 1 },
      translators: { items: [{ slug: "ali", name: "Ali", imageUrl: null, bookCount: 2 }], total: 1 },
      publishers: { items: [{ slug: "sharq", name: "Sharq", imageUrl: "http://reads-admin-app/storage/sharq.png", bookCount: 1 }], total: 1 },
    });
  });

  it("sends the visitor's address and not the site's token, so typing never spends the site's bucket", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "site-shared-secret");
    fetchMock.mockResolvedValueOnce(Response.json(upstreamBody));

    await search("otkan", { "X-Forwarded-For": "6.6.6.6, 203.0.113.9" });

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers["X-Forwarded-For"]).toBe("203.0.113.9");
    expect(headers).not.toHaveProperty("Authorization");
    vi.unstubAllEnvs();
  });

  it("answers the same query again from memory, whatever its case or spacing", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(upstreamBody));

    await search("otkan");
    const again = await search("  OTKAN ");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect((await again.json()).books.total).toBe(1);
    expect(again.headers.get("Cache-Control")).toBe("private, max-age=60");
  });

  it("does not ask about a query too short to search", async () => {
    const response = await search("a");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await response.json()).toEqual(EMPTY_RESULTS);
  });

  it("passes a rate limit on as a 429 and remembers nothing", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 429 }));

    expect((await search("otkan")).status).toBe(429);
    expect((await search("otkan")).status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("is a 502 when Reads-admin fails or cannot be reached", async () => {
    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 500 }));
    expect((await search("otkan")).status).toBe(502);

    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    const unreachable = await search("dengiz");
    expect(unreachable.status).toBe(502);
    expect(unreachable.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("searchCache", () => {
  it("forgets an answer after a minute", () => {
    searchCache.set("otkan", EMPTY_RESULTS, 0);

    expect(searchCache.get("otkan", 59_999)).toBe(EMPTY_RESULTS);
    expect(searchCache.get("otkan", 60_000)).toBeUndefined();
  });

  it("drops the oldest answer once full", () => {
    searchCache.clear();
    for (let i = 0; i < 501; i++) searchCache.set(`q${i}`, EMPTY_RESULTS, 0);

    expect(searchCache.size).toBe(500);
    expect(searchCache.get("q0", 0)).toBeUndefined();
    expect(searchCache.get("q500", 0)).toBe(EMPTY_RESULTS);
  });
});
