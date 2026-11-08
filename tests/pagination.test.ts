import { describe, expect, it } from "vitest";
import { compactPageNumbers, pageNumbers } from "@/lib/pagination";

describe("pageNumbers", () => {
  it("shows every page up to 7", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("collapses the middle past 7", () => {
    expect(pageNumbers(4, 20)).toEqual([1, 2, 3, 4, 5, "…", 20]);
    expect(pageNumbers(10, 20)).toEqual([1, "…", 9, 10, 11, "…", 20]);
    expect(pageNumbers(17, 20)).toEqual([1, "…", 16, 17, 18, 19, 20]);
  });
});

describe("compactPageNumbers", () => {
  it("shows every page up to 5", () => {
    expect(compactPageNumbers(1, 1)).toEqual([1]);
    expect(compactPageNumbers(5, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses around the start, the middle and the end", () => {
    expect(compactPageNumbers(1, 664)).toEqual([1, 2, 3, "…", 664]);
    expect(compactPageNumbers(2, 664)).toEqual([1, 2, 3, "…", 664]);
    expect(compactPageNumbers(3, 664)).toEqual([1, "…", 3, "…", 664]);
    expect(compactPageNumbers(300, 664)).toEqual([1, "…", 300, "…", 664]);
    expect(compactPageNumbers(663, 664)).toEqual([1, "…", 662, 663, 664]);
    expect(compactPageNumbers(664, 664)).toEqual([1, "…", 662, 663, 664]);
  });

  it("always has at most 5 slots, with the first, last and current page", () => {
    for (const total of [1, 2, 5, 6, 7, 8, 9, 664]) {
      for (let current = 1; current <= total; current += 1) {
        const items = compactPageNumbers(current, total);
        expect(items.length).toBeLessThanOrEqual(5);
        expect(items).toContain(1);
        expect(items).toContain(total);
        expect(items).toContain(current);
      }
    }
  });
});
