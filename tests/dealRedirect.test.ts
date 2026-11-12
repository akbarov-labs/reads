import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// What after() was handed, run by the test once the response is back.
const deferred: (() => unknown)[] = [];
vi.mock("next/server", () => ({ after: (task: () => unknown) => deferred.push(task) }));

const api = vi.hoisted(() => ({ getDeal: vi.fn() }));
vi.mock("@/lib/api", () => api);

const { GET, HEAD } = await import("@/app/go/deal/[id]/route");

const BROWSER = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";

function visit(id: string, query = "?l=uz", headers: Record<string, string> = {}, method = "GET") {
  const request = new Request(`https://kitoblarim.uz/go/deal/${id}${query}`, {
    method,
    headers: { "User-Agent": BROWSER, "X-Forwarded-For": "203.0.113.9", ...headers },
  });

  return (method === "HEAD" ? HEAD : GET)(request, { params: Promise.resolve({ id }) });
}

async function runDeferred() {
  while (deferred.length) await deferred.shift()!();
}

describe("GET /go/deal/[id]", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("REVALIDATE_SECRET", "site-secret");
    api.getDeal.mockResolvedValue({ id: "12", url: "https://qamar.uz/aksiya" });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    deferred.length = 0;
    fetchMock.mockReset();
    api.getDeal.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends the reader to the deal's own link, never to one from the URL", async () => {
    const response = await visit("12", "?l=ru&to=https://evil.example");

    expect(response.status).toBe(302);
    expect(api.getDeal).toHaveBeenCalledWith("12");
    expect(response.headers.get("Location")).toBe("https://qamar.uz/aksiya");
    expect(response.headers.get("Cache-Control")).toBe("no-store, private");
  });

  it("logs the click as the deal's target after answering", async () => {
    await visit("12", "?l=ru");
    expect(fetchMock).not.toHaveBeenCalled();

    await runDeferred();

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      kind: "deal",
      book_id: null,
      announcement_id: null,
      target: "deal-12",
      locale: "ru",
      ip: "203.0.113.9",
      user_agent: BROWSER,
    });
  });

  it("is a 404 for an ended deal, a bad id or a link that isn't a web address", async () => {
    api.getDeal.mockResolvedValueOnce(null);
    expect((await visit("12")).status).toBe(404);

    expect((await visit("abc")).status).toBe(404);

    api.getDeal.mockResolvedValueOnce({ id: "13", url: "javascript:alert(1)" });
    expect((await visit("13")).status).toBe(404);

    await runDeferred();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers a HEAD without counting it", async () => {
    const head = await visit("12", "?l=uz", {}, "HEAD");
    await runDeferred();

    expect(head.status).toBe(302);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
