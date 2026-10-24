import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Announcement } from "@/lib/types";

// What after() was handed, run by the test once the response is back.
const deferred: (() => unknown)[] = [];
vi.mock("next/server", () => ({ after: (task: () => unknown) => deferred.push(task) }));

const getAnnouncement = vi.fn();
vi.mock("@/lib/api", () => ({ getAnnouncement: (...args: unknown[]) => getAnnouncement(...args) }));

const { GET, HEAD } = await import("@/app/go/order/[id]/route");
const { orderMessage, orderRedirectPath, orderUrl } = await import("@/lib/order");
const { formatDay, formatSum, stillOpen, tashkentToday } = await import("@/lib/announcements");

const BROWSER = "Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36 Telegram-Android/11.4.2";

const ANNOUNCEMENT: Announcement = {
  id: "7",
  title: "Jinoyat va jazo",
  author: "Fyodor Dostoyevskiy",
  translator: null,
  isPreorder: true,
  price: 120000,
  preorderPrice: 95000,
  preorderDeadline: "2026-10-31",
  coverUrl: null,
  postedAt: "2026-10-20T09:15:00+00:00",
  sourceUrl: "https://t.me/hilolnashr/41",
  orderContact: "hilol_buyurtma",
  publisher: { slug: "hilol-nashr", name: "Hilol-nashr" },
  bookId: null,
};

describe("orderUrl", () => {
  it("opens the publisher's chat with the order typed, naming the book and kitoblarim.uz", () => {
    const url = new URL(orderUrl(ANNOUNCEMENT, "uz")!);

    expect(url.origin + url.pathname).toBe("https://t.me/hilol_buyurtma");
    expect(url.searchParams.get("text")).toBe(
      "Assalomu alaykum! kitoblarim.uz saytida «Jinoyat va jazo» kitobini koʻrdim. Buyurtma bermoqchiman.",
    );
  });

  it("writes the message in the reader's language", () => {
    expect(orderMessage("Мастер и Маргарита", "ru")).toBe("Здравствуйте! Увидел(а) на kitoblarim.uz книгу «Мастер и Маргарита». Хочу заказать.");
    expect(orderMessage("Kecha va kunduz", "en")).toContain("on kitoblarim.uz");
    expect(orderMessage("Kecha va kunduz", "de")).toContain("kitoblarim.uz saytida");
  });

  it("keeps a title's & and ? inside the message", () => {
    const url = new URL(orderUrl({ ...ANNOUNCEMENT, title: "Qilich & qalam?" }, "uz")!);

    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.searchParams.get("text")).toContain("«Qilich & qalam?»");
  });

  it("falls back to the post when the publisher has no order account", () => {
    expect(orderUrl({ ...ANNOUNCEMENT, orderContact: null }, "uz")).toBe("https://t.me/hilolnashr/41");
  });

  it("sends nobody anywhere but Telegram", () => {
    expect(orderUrl({ ...ANNOUNCEMENT, orderContact: "evil.example/x" }, "uz")).toBe("https://t.me/hilolnashr/41");
    expect(orderUrl({ ...ANNOUNCEMENT, orderContact: null, sourceUrl: "https://evil.example/1" }, "uz")).toBeNull();
  });

  it("points the button at the counting redirect", () => {
    expect(orderRedirectPath("7", "ru")).toBe("/go/order/7?l=ru");
  });
});

describe("showing announcements", () => {
  it("keeps a pre-order through its last Tashkent day", () => {
    const lastDay = { ...ANNOUNCEMENT, preorderDeadline: "2026-10-24" };
    const newBook = { ...ANNOUNCEMENT, id: "8", preorderDeadline: null };

    // 18:59 UTC is 23:59 in Tashkent.
    expect(tashkentToday(new Date("2026-10-24T18:59:00Z"))).toBe("2026-10-24");
    expect(stillOpen([lastDay, newBook], new Date("2026-10-24T18:59:00Z"))).toHaveLength(2);
    expect(stillOpen([lastDay, newBook], new Date("2026-10-24T19:00:00Z"))).toEqual([newBook]);
  });

  it("writes sums and days as readers do", () => {
    expect(formatSum(95000, "uz")).toBe("95 000");
    expect(formatSum(95000, "ru")).toBe("95 000");
    expect(formatSum(95000, "en")).toBe("95,000");
    expect(formatDay("2026-10-31", "ru")).toBe("31 октября");
    expect(formatDay("2026-10-31", "en")).toBe("October 31");
  });
});

describe("GET /go/order/[id]", () => {
  const fetchMock = vi.fn();

  function visit(id: string, headers: Record<string, string> = {}, method = "GET") {
    const request = new Request(`https://kitoblarim.uz/go/order/${id}?l=uz`, {
      method,
      headers: { "User-Agent": BROWSER, "X-Forwarded-For": "203.0.113.9", ...headers },
    });

    return (method === "HEAD" ? HEAD : GET)(request, { params: Promise.resolve({ id }) });
  }

  async function runDeferred() {
    while (deferred.length) await deferred.shift()!();
  }

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("REVALIDATE_SECRET", "site-secret");
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    getAnnouncement.mockResolvedValue(ANNOUNCEMENT);
  });

  afterEach(() => {
    deferred.length = 0;
    fetchMock.mockReset();
    getAnnouncement.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends the reader to the publisher's chat and counts the order afterwards", async () => {
    const response = await visit("7");

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toMatch(/^https:\/\/t\.me\/hilol_buyurtma\?text=Assalomu/);
    expect(response.headers.get("Cache-Control")).toBe("no-store, private");
    expect(fetchMock).not.toHaveBeenCalled();

    await runDeferred();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://reads-admin-app/api/clicks");
    expect(JSON.parse(init.body)).toEqual({
      kind: "publisher_order",
      book_id: null,
      announcement_id: 7,
      target: null,
      locale: "uz",
      ip: "203.0.113.9",
      user_agent: BROWSER,
    });
  });

  it("answers 404 for an announcement that has expired or never was, and counts nothing", async () => {
    getAnnouncement.mockResolvedValue(null);

    expect((await visit("7")).status).toBe(404);
    expect((await visit("7abc")).status).toBe(404);
    await runDeferred();

    expect(getAnnouncement).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("says so when the catalogue is down", async () => {
    getAnnouncement.mockRejectedValue(new Error("Reads-admin API request failed: 503"));

    const response = await visit("7");
    await runDeferred();

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not count a bot or a HEAD request", async () => {
    expect((await visit("7", { "User-Agent": "TelegramBot (like TwitterBot)" })).status).toBe(302);
    expect((await visit("7", {}, "HEAD")).status).toBe(302);
    await runDeferred();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
