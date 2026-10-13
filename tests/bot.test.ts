import { describe, expect, it } from "vitest";
import { botPlanUrl, botUrl } from "@/lib/bot";

const FALLBACK = "https://t.me/kitob_javonim_bot?start=src_reads";

describe("botUrl", () => {
  it("tags the plain link with the reads partner", () => {
    expect(botUrl()).toBe(FALLBACK);
  });
});

describe("botPlanUrl", () => {
  it("plans a book by its ISBN-13, hyphens stripped", () => {
    expect(botPlanUrl("978-9943-01-234-5")).toBe("https://t.me/kitob_javonim_bot?start=plan_9789943012345_reads");
  });

  it("accepts an ISBN-10 with a check digit X, upper-cased", () => {
    expect(botPlanUrl("0-306-40615-x")).toBe("https://t.me/kitob_javonim_bot?start=plan_030640615X_reads");
  });

  it.each([undefined, null, "", "n/a", "12345", "123456789", "97899430123456789"])("falls back to src_reads for %j", (isbn) => {
    expect(botPlanUrl(isbn)).toBe(FALLBACK);
  });

  it("only ever produces a Telegram start payload of safe characters", () => {
    const url = new URL(botPlanUrl("978 9943<script>01234 5"));
    expect(url.searchParams.get("start")).toMatch(/^[A-Za-z0-9_]+$/);
  });
});
