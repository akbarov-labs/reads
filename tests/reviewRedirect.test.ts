import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bookIsbn, botReviewRedirectPath } from "@/lib/bot";

// What after() was handed, run by the test once the response is back, the
// way Next runs it once the response has gone.
const deferred: (() => unknown)[] = [];
vi.mock("next/server", () => ({ after: (task: () => unknown) => deferred.push(task) }));

const api = vi.hoisted(() => ({ getBookById: vi.fn() }));
vi.mock("@/lib/api", () => api);

const { GET, HEAD } = await import("@/app/go/review/[bookId]/route");

const BROWSER = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36 Telegram-Android/11.2.3";

function visit(bookId: string, query = "?l=uz", headers: Record<string, string> = {}, method = "GET") {
  const request = new Request(`https://kitoblarim.uz/go/review/${bookId}${query}`, {
    method,
    headers: { "User-Agent": BROWSER, "X-Forwarded-For": "203.0.113.9", ...headers },
  });
  const handler = method === "HEAD" ? HEAD : GET;

  return handler(request, { params: Promise.resolve({ bookId }) });
}

async function runDeferred() {
  while (deferred.length) await deferred.shift()!();
}

describe("botReviewRedirectPath", () => {
  it("points at the counting redirect when the book has an ISBN", () => {
    expect(botReviewRedirectPath("79", "ru", "978-9943-01-234-5")).toBe("/go/review/79?l=ru");
  });

  it.each([undefined, null, "", "12345"])("is null without a usable ISBN (%j), so the page shows no button", (isbn) => {
    expect(botReviewRedirectPath("79", "uz", isbn)).toBeNull();
  });
});

describe("bookIsbn", () => {
  it("takes the first printing that has an ISBN", () => {
    expect(bookIsbn({ editions: [{ isbn: null }, { isbn: "9789943012345" }, { isbn: "9789910847011" }] })).toBe("9789943012345");
  });

  it("is undefined for a book with no ISBN anywhere", () => {
    expect(bookIsbn({ editions: [{ isbn: null }] })).toBeUndefined();
    expect(bookIsbn({})).toBeUndefined();
  });
});

describe("GET /go/review/[bookId]", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("REVALIDATE_SECRET", "site-secret");
    api.getBookById.mockResolvedValue({ id: "79", editions: [{ isbn: null }, { isbn: "978-9943-01-234-5" }] });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    deferred.length = 0;
    fetchMock.mockReset();
    api.getBookById.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends the reader to the bot's review for the book's ISBN", async () => {
    const response = await visit("79", "?l=ru");

    expect(response.status).toBe(302);
    expect(api.getBookById).toHaveBeenCalledWith("79", "ru");
    expect(response.headers.get("Location")).toBe("https://t.me/kitob_javonim_bot?start=review_9789943012345_reads");
  });

  it("is never cached or indexed", async () => {
    const response = await visit("79");

    expect(response.headers.get("Cache-Control")).toBe("no-store, private");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("logs the click with its book, only after the redirect is answered", async () => {
    await visit("79");
    expect(fetchMock).not.toHaveBeenCalled();

    await runDeferred();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://reads-admin-app/api/clicks");
    expect(JSON.parse(init.body)).toEqual({
      kind: "bot_review",
      book_id: 79,
      announcement_id: null,
      target: null,
      locale: "uz",
      ip: "203.0.113.9",
      user_agent: BROWSER,
    });
  });

  it("does not count a crawler, a prefetch or a HEAD request", async () => {
    await visit("79", "?l=uz", { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" });
    await visit("79", "?l=uz", { "Sec-Purpose": "prefetch" });
    const head = await visit("79", "?l=uz", {}, "HEAD");
    await runDeferred();

    expect(head.status).toBe(302);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is a 404, uncounted, for a book with no ISBN", async () => {
    api.getBookById.mockResolvedValue({ id: "80", editions: [{ isbn: null }] });

    const response = await visit("80");
    await runDeferred();

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["no such book", "999", null],
    ["a book id that is not a number", "..%2F..%2Fadmin", undefined],
  ])("is a 404 for %s", async (_, bookId, book) => {
    if (book !== undefined) api.getBookById.mockResolvedValue(book);

    const response = await visit(bookId);

    expect(response.status).toBe(404);
    expect(response.headers.get("Location")).toBeNull();
  });

  it("is a 503, uncounted, when the catalogue is unreachable", async () => {
    api.getBookById.mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await visit("79");
    await runDeferred();

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
