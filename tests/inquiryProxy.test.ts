import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/inquiries/[slug]/route";

// vitest.config.ts pins API_URL to the production Docker address.
const UPSTREAM = "http://reads-admin-app/api/translators/ali-valiyev/inquiries";

function submit(slug: string, body = '{"name":"A"}', headers: Record<string, string> = {}) {
  const request = new Request(`https://kitoblarim.uz/api/inquiries/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });

  return POST(request, { params: Promise.resolve({ slug }) });
}

describe("POST /api/inquiries/[slug]", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("forwards the body to Reads-admin and passes its answer through", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"errors":{"email":["bad"]}}', {
        status: 422,
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await submit("ali-valiyev", '{"name":"A"}');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(UPSTREAM);
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"name":"A"}');
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ errors: { email: ["bad"] } });
  });

  it("sends the visitor's address for the admin's per-IP rate limit", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 201 }));

    await submit("ali-valiyev", "{}", { "X-Forwarded-For": "203.0.113.9" });

    expect(fetchMock.mock.calls[0][1].headers["X-Forwarded-For"]).toBe("203.0.113.9");
  });

  it("trusts only the last X-Forwarded-For entry, the one the edge proxy added", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 201 }));

    await submit("ali-valiyev", "{}", { "X-Forwarded-For": "6.6.6.6, 203.0.113.9" });

    expect(fetchMock.mock.calls[0][1].headers["X-Forwarded-For"]).toBe("203.0.113.9");
  });

  it.each(["..", "a/b", "x%2F..", ""])("refuses slug %j without calling the admin", async (slug) => {
    const response = await submit(slug);

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an oversized body", async () => {
    const response = await submit("ali-valiyev", "x".repeat(40 * 1024));

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 502 when the admin is unreachable", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    const response = await submit("ali-valiyev");

    expect(response.status).toBe(502);
  });

  it("files nothing when inquiries are disabled (staging)", async () => {
    vi.stubEnv("INQUIRIES_DISABLED", "true");

    const response = await submit("ali-valiyev");

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
