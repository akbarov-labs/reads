import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// What after() was handed, run by the test once the response is back.
const deferred: (() => unknown)[] = [];
vi.mock("next/server", () => ({ after: (task: () => unknown) => deferred.push(task) }));

const { POST } = await import("@/app/api/note/route");
const { listingSearch } = await import("@/lib/stats");

const BROWSER = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36";

function note(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request("https://kitoblarim.uz/api/note", {
      method: "POST",
      // As sendBeacon sends a string: text/plain.
      headers: { "Content-Type": "text/plain;charset=UTF-8", "User-Agent": BROWSER, "X-Forwarded-For": "203.0.113.9", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function runDeferred() {
  while (deferred.length) await deferred.shift()!();
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("REVALIDATE_SECRET", "site-secret");
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
});

afterEach(() => {
  deferred.length = 0;
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function sent() {
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url, init] = fetchMock.mock.calls[0];
  expect(init.headers.Authorization).toBe("Bearer site-secret");
  return { url, body: JSON.parse(init.body) };
}

describe("POST /api/note", () => {
  it("passes a book view on to Reads-admin after answering", async () => {
    const response = await note({ type: "view", bookId: "42", locale: "ru" });

    expect(response.status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();

    await runDeferred();

    expect(sent()).toEqual({
      url: "http://reads-admin-app/api/views",
      body: { book_id: 42, locale: "ru", ip: "203.0.113.9", user_agent: BROWSER },
    });
  });

  it("passes on a suggestion picked from the search box", async () => {
    await note({ type: "search", query: "  otkan  ", picked: "/book/42", locale: "uz" });
    await runDeferred();

    expect(sent()).toEqual({
      url: "http://reads-admin-app/api/searches",
      body: {
        query: "otkan",
        source: "box",
        results: null,
        picked: "/book/42",
        locale: "uz",
        ip: "203.0.113.9",
        user_agent: BROWSER,
      },
    });
  });

  it.each([
    ["a bot", { type: "view", bookId: "42", locale: "uz" }, { "User-Agent": "Googlebot/2.1" }],
    ["no user agent", { type: "view", bookId: "42", locale: "uz" }, { "User-Agent": "" }],
    ["a book id that is not one", { type: "view", bookId: "../1", locale: "uz" }, {}],
    ["an unknown locale", { type: "view", bookId: "42", locale: "de" }, {}],
    ["an unknown type", { type: "click", bookId: "42", locale: "uz" }, {}],
    ["a pick off the site", { type: "search", query: "x", picked: "https://evil.example/", locale: "uz" }, {}],
    ["a pick of the listing", { type: "search", query: "x", picked: "/books?q=x", locale: "uz" }, {}],
    ["an empty query", { type: "search", query: "  ", picked: "/book/1", locale: "uz" }, {}],
    ["broken JSON", "{not json", {}],
    ["an oversized body", { type: "view", bookId: "42", locale: "uz", pad: "x".repeat(4000) }, {}],
  ])("answers 204 and sends nothing for %s", async (_name, body, headers) => {
    const response = await note(body, headers as Record<string, string>);
    await runDeferred();

    expect(response.status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends nothing without the shared secret (staging)", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "");

    await note({ type: "view", bookId: "42", locale: "uz" });
    await runDeferred();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers the same when Reads-admin is down", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await note({ type: "view", bookId: "42", locale: "uz" });
    await expect(runDeferred()).resolves.toBeUndefined();

    expect(response.status).toBe(204);
  });
});

describe("listingSearch", () => {
  const browser = new Headers({ "User-Agent": BROWSER, "X-Forwarded-For": "6.6.6.6, 203.0.113.9" });

  it("counts the first page of a plain query, with what it found", () => {
    expect(listingSearch({ q: " Garri Potter ", page: 1, filters: [undefined, undefined] }, 0, "uz", browser)).toEqual({
      query: "Garri Potter",
      source: "page",
      results: 0,
      locale: "uz",
      ip: "203.0.113.9",
      userAgent: BROWSER,
    });
  });

  it.each([
    ["no query", { q: undefined, page: 1, filters: [] }],
    ["a blank query", { q: "  ", page: 1, filters: [] }],
    ["the next page", { q: "tazarru", page: 2, filters: [] }],
    ["a query narrowed to a category", { q: "tazarru", page: 1, filters: ["roman", undefined] }],
  ])("does not count %s", (_name, listing) => {
    expect(listingSearch(listing, 3, "uz", browser)).toBeNull();
  });

  it("does not count a crawler", () => {
    expect(listingSearch({ q: "tazarru", page: 1, filters: [] }, 3, "uz", new Headers({ "User-Agent": "bingbot/2.0" }))).toBeNull();
  });
});
