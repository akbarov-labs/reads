import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// What after() was handed, run by the test once the response is back, the
// way Next runs it once the response has gone.
const deferred: (() => unknown)[] = [];
vi.mock("next/server", () => ({ after: (task: () => unknown) => deferred.push(task) }));

const api = vi.hoisted(() => ({ getBooks: vi.fn() }));
vi.mock("@/lib/api", () => api);

const { GET, HEAD } = await import("@/app/go/isbn/[isbn]/route");

const BROWSER = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36 Telegram-Android/11.2.3";
const ISBN = "9789943012345";

function visit(isbn: string, query = "?l=uz", headers: Record<string, string> = {}, method = "GET") {
  const request = new Request(`https://kitoblarim.uz/go/isbn/${isbn}${query}`, {
    method,
    headers: { "User-Agent": BROWSER, "X-Forwarded-For": "203.0.113.9", ...headers },
  });
  const handler = method === "HEAD" ? HEAD : GET;

  return handler(request, { params: Promise.resolve({ isbn }) });
}

async function runDeferred() {
  while (deferred.length) await deferred.shift()!();
}

describe("GET /go/isbn/[isbn]", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("REVALIDATE_SECRET", "site-secret");
    api.getBooks.mockResolvedValue({ items: [{ id: "79" }] });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    deferred.length = 0;
  });

  it("finds the book by that exact ISBN, opens its page in the list's language and counts the click", async () => {
    const response = await visit(ISBN, "?l=ru");
    await runDeferred();

    expect(api.getBooks).toHaveBeenCalledWith("ru", { isbn: ISBN, perPage: 1 });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/ru/book/79");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/clicks$/);
    expect(JSON.parse(init.body)).toMatchObject({ kind: "shared_list", book_id: 79, locale: "ru" });
  });

  it("opens at the readers' section when the reader made their review public", async () => {
    const response = await visit(ISBN, "?l=uz&r=1");

    expect(response.headers.get("location")).toBe("/uz/book/79#readers");
  });

  it("falls back to the default language", async () => {
    const response = await visit(ISBN, "?l=fr");

    expect(response.headers.get("location")).toBe("/uz/book/79");
  });

  it("sends a book the site doesn't have yet to the catalogue, uncounted", async () => {
    api.getBooks.mockResolvedValue({ items: [] });

    const response = await visit(ISBN, "?l=en&r=1");
    await runDeferred();

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/en/books");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is a 503, uncounted, when the catalogue can't be reached", async () => {
    api.getBooks.mockRejectedValue(new Error("down"));

    const response = await visit(ISBN);
    await runDeferred();

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["12345", "978994301234X", "978-9943-01-234-5", "..%2F..%2Fadmin", "https:%2F%2Fevil.example"])(
    "is a 404 without asking the API for %s",
    async (isbn) => {
      const response = await visit(isbn);

      expect(response.status).toBe(404);
      expect(api.getBooks).not.toHaveBeenCalled();
    },
  );

  it("does not count a crawler, a link preview, a prefetch or a HEAD request", async () => {
    await visit(ISBN, "?l=uz", { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" });
    await visit(ISBN, "?l=uz", { "User-Agent": "TelegramBot (like TwitterBot)" });
    await visit(ISBN, "?l=uz", { "Sec-Purpose": "prefetch" });
    const head = await visit(ISBN, "?l=uz", {}, "HEAD");
    await runDeferred();

    expect(head.status).toBe(302);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
