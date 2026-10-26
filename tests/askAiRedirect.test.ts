import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askAiRedirectPath } from "@/lib/askAi";

// What after() was handed, run by the test once the response is back, the
// way Next runs it once the response has gone.
const deferred: (() => unknown)[] = [];
vi.mock("next/server", () => ({ after: (task: () => unknown) => deferred.push(task) }));

const api = vi.hoisted(() => ({
  getBookById: vi.fn(),
  getAuthorBySlug: vi.fn(),
  getTranslatorBySlug: vi.fn(),
  getPublisherBySlug: vi.fn(),
}));
vi.mock("@/lib/api", () => api);

const { GET, HEAD } = await import("@/app/go/ai/[subject]/[id]/route");

const BROWSER = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1";

function visit(subject: string, id: string, query = "?l=uz", headers: Record<string, string> = {}, method = "GET") {
  const request = new Request(`https://kitoblarim.uz/go/ai/${subject}/${id}${query}`, {
    method,
    headers: { "User-Agent": BROWSER, "X-Forwarded-For": "203.0.113.9", ...headers },
  });
  const handler = method === "HEAD" ? HEAD : GET;

  return handler(request, { params: Promise.resolve({ subject, id }) });
}

async function runDeferred() {
  while (deferred.length) await deferred.shift()!();
}

/** The question AI Mode is asked, from the redirect's Location. */
function asked(response: Response): string | null {
  const location = new URL(response.headers.get("Location")!);
  expect(location.origin + location.pathname).toBe("https://www.google.com/search");
  expect(location.searchParams.get("udm")).toBe("50");
  return location.searchParams.get("q");
}

describe("askAiRedirectPath", () => {
  it("points at the counting redirect, never at the question", () => {
    expect(askAiRedirectPath("book", "79", "ru")).toBe("/go/ai/book/79?l=ru");
    expect(askAiRedirectPath("author", "otkir-hoshimov", "uz")).toBe("/go/ai/author/otkir-hoshimov?l=uz");
  });
});

describe("GET /go/ai/[subject]/[id]", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("REVALIDATE_SECRET", "site-secret");
    api.getBookById.mockResolvedValue({ id: "79", uzbekTitle: "Ikki eshik orasi", author: "Oʻtkir Hoshimov" });
    api.getAuthorBySlug.mockResolvedValue({ slug: "otkir-hoshimov", name: "Oʻtkir Hoshimov" });
    api.getTranslatorBySlug.mockResolvedValue({ slug: "ibrohim-gafurov", name: "Ibrohim Gʻafurov" });
    api.getPublisherBySlug.mockResolvedValue({ slug: "nurli-dunyo", name: "Nurli dunyo" });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    deferred.length = 0;
    fetchMock.mockReset();
    Object.values(api).forEach((mock) => mock.mockReset());
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends the reader to AI Mode with the book's question, in their language", async () => {
    const response = await visit("book", "79", "?l=ru");

    expect(response.status).toBe(302);
    expect(api.getBookById).toHaveBeenCalledWith("79", "ru");
    expect(asked(response)).toBe(
      "Расскажи подробно о книге «Ikki eshik orasi» (Oʻtkir Hoshimov): о чём она, её главные идеи, кому и почему её стоит прочитать?",
    );
    expect(new URL(response.headers.get("Location")!).searchParams.get("hl")).toBe("ru");
  });

  it.each([
    ["author", "otkir-hoshimov", "Yozuvchi Oʻtkir Hoshimov haqida"],
    ["translator", "ibrohim-gafurov", "Tarjimon Ibrohim Gʻafurov haqida"],
    ["publisher", "nurli-dunyo", "«Nurli dunyo» nashriyoti haqida"],
  ])("asks about the %s", async (subject, id, start) => {
    const response = await visit(subject, id);

    expect(response.status).toBe(302);
    expect(asked(response)?.startsWith(start)).toBe(true);
  });

  it("is never cached or indexed", async () => {
    const response = await visit("book", "79");

    expect(response.headers.get("Cache-Control")).toBe("no-store, private");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("logs a book page's click with its book, only after the redirect is answered", async () => {
    await visit("book", "79");
    expect(fetchMock).not.toHaveBeenCalled();

    await runDeferred();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://reads-admin-app/api/clicks");
    expect(JSON.parse(init.body)).toEqual({
      kind: "ask_ai",
      book_id: 79,
      announcement_id: null,
      target: "book",
      locale: "uz",
      ip: "203.0.113.9",
      user_agent: BROWSER,
    });
  });

  it("logs an author page's click with no book", async () => {
    await visit("author", "otkir-hoshimov", "?l=en");
    await runDeferred();

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ kind: "ask_ai", book_id: null, target: "author", locale: "en" });
  });

  it("does not count a crawler, a prefetch or a HEAD request", async () => {
    await visit("book", "79", "?l=uz", { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" });
    await visit("book", "79", "?l=uz", { "Sec-Purpose": "prefetch" });
    const head = await visit("book", "79", "?l=uz", {}, "HEAD");
    await runDeferred();

    expect(head.status).toBe(302);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a page kind without the button", "taqriz", "7"],
    ["a book id that is not a number", "book", "..%2F..%2Fadmin"],
    ["a slug with a slash", "author", "a%2Fb"],
  ])("answers 404 for %s, and counts nothing", async (_name, subject, id) => {
    const response = await visit(subject, id);
    await runDeferred();

    expect(response.status).toBe(404);
    expect(Object.values(api).every((mock) => mock.mock.calls.length === 0)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 404 for a page that does not exist", async () => {
    api.getAuthorBySlug.mockResolvedValue(null);

    expect((await visit("author", "nobody")).status).toBe(404);
  });

  it("answers 503, and counts nothing, when the catalogue is down", async () => {
    api.getBookById.mockRejectedValue(new Error("Reads-admin API request failed: 503"));

    const response = await visit("book", "79");
    await runDeferred();

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
