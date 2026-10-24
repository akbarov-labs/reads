import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// What after() was handed, run by the test once the response is back, the
// way Next runs it once the response has gone.
const deferred: (() => unknown)[] = [];
vi.mock("next/server", () => ({ after: (task: () => unknown) => deferred.push(task) }));

const getBookById = vi.fn();
vi.mock("@/lib/api", () => ({ getBookById: (...args: unknown[]) => getBookById(...args) }));

// Only middleware.ts's matcher is under test, not next-intl's middleware.
vi.mock("next-intl/middleware", () => ({ default: () => () => null }));

const { GET, HEAD } = await import("@/app/go/store/[store]/[bookId]/route");
const robots = (await import("@/app/robots")).default;
const { config } = await import("@/middleware");

const BROWSER = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1";

function visit(store: string, bookId: string, query = "?l=ru", headers: Record<string, string> = {}, method = "GET") {
  const request = new Request(`https://kitoblarim.uz/go/store/${store}/${bookId}${query}`, {
    method,
    headers: { "User-Agent": BROWSER, "X-Forwarded-For": "203.0.113.9", ...headers },
  });
  const handler = method === "HEAD" ? HEAD : GET;

  return handler(request, { params: Promise.resolve({ store, bookId }) });
}

async function runDeferred() {
  while (deferred.length) await deferred.shift()!();
}

describe("GET /go/store/[store]/[bookId]", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("REVALIDATE_SECRET", "site-secret");
    getBookById.mockResolvedValue({ id: "42", uzbekTitle: "Tazarru (Tergovchi)" });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    deferred.length = 0;
    fetchMock.mockReset();
    getBookById.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends the reader to the store's search for the book's title", async () => {
    const response = await visit("book.uz", "42");

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://book.uz/catalog?search=Tazarru");
    expect(getBookById).toHaveBeenCalledWith("42", "ru");
  });

  it("is never cached or indexed", async () => {
    const response = await visit("asaxiy", "42");

    expect(response.headers.get("Cache-Control")).toBe("no-store, private");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("logs the click to Reads-admin only after the redirect is answered", async () => {
    const response = await visit("asaxiy", "42");

    expect(response.status).toBe(302);
    expect(fetchMock).not.toHaveBeenCalled();

    await runDeferred();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://reads-admin-app/api/clicks");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer site-secret");
    expect(JSON.parse(init.body)).toEqual({
      kind: "store",
      book_id: 42,
      announcement_id: null,
      target: "asaxiy",
      locale: "ru",
      ip: "203.0.113.9",
      user_agent: BROWSER,
    });
  });

  it("still redirects when the log call fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await visit("qamar", "42");
    await expect(runDeferred()).resolves.toBeUndefined();

    expect(response.status).toBe(302);
  });

  it("falls back to the default language", async () => {
    await visit("qamar", "42", "?l=de");

    expect(getBookById).toHaveBeenCalledWith("42", "uz");
  });

  it.each([
    ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
    ["Telegram's link preview", "TelegramBot (like TwitterBot)"],
    ["curl", "curl/8.7.1"],
    ["no user agent", ""],
    ["ClaudeBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)"],
    ["an assistant fetching for a user", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot"],
    ["WhatsApp's link preview", "WhatsApp/2.23.20.0"],
  ])("does not count %s", async (_name, userAgent) => {
    const response = await visit("asaxiy", "42", "?l=uz", { "User-Agent": userAgent });
    await runDeferred();

    expect(response.status).toBe(302);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["Telegram's Android in-app browser", "Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36 Telegram-Android/11.4.2 (Samsung SM-A546E; Android 14; SDK 34; AVERAGE)"],
    ["a desktop app's built-in browser", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Claude/3.6556.2 Chrome/152.0.7977.167 Safari/537.36"],
    ["Yandex Browser", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 YaBrowser/24.10.0.0 Safari/537.36"],
  ])("counts a reader in %s", async (_name, userAgent) => {
    await visit("asaxiy", "42", "?l=uz", { "User-Agent": userAgent });
    await runDeferred();

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not count a browser's prefetch", async () => {
    await visit("asaxiy", "42", "?l=uz", { "Sec-Purpose": "prefetch;prerender" });
    await runDeferred();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not count a HEAD request", async () => {
    const response = await visit("asaxiy", "42", "?l=uz", {}, "HEAD");
    await runDeferred();

    expect(response.status).toBe(302);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends nothing without the shared secret (staging)", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "");

    const response = await visit("asaxiy", "42");
    await runDeferred();

    expect(response.status).toBe(302);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown store", "evil.example", "42"],
    ["a book id that is not a number", "asaxiy", "..%2F..%2Fadmin"],
  ])("answers 404 for %s, and counts nothing", async (_name, store, bookId) => {
    const response = await visit(store, bookId);
    await runDeferred();

    expect(response.status).toBe(404);
    expect(getBookById).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 404 for a book that does not exist", async () => {
    getBookById.mockResolvedValue(null);

    const response = await visit("asaxiy", "999");

    expect(response.status).toBe(404);
  });

  it("sends the reader to the store's search when the catalogue is down", async () => {
    getBookById.mockRejectedValue(new Error("Reads-admin API request failed: 503"));

    const response = await visit("asaxiy", "42");

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://asaxiy.uz/product?key=");
  });
});

describe("keeping /go/ out of crawls and locale routing", () => {
  it("is disallowed for every crawler", () => {
    const rules = robots().rules;
    for (const rule of Array.isArray(rules) ? rules : [rules]) {
      expect(rule.disallow).toContain("/go/");
    }
  });

  it("is not given a locale prefix by the middleware", () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`);

    expect(matcher.test("/go/store/asaxiy/42")).toBe(false);
    expect(matcher.test("/books")).toBe(true);
    expect(matcher.test("/google-books")).toBe(true);
  });
});
