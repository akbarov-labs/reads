import { describe, expect, it } from "vitest";
import { keptBookPath } from "@/lib/bookAddress";

describe("keptBookPath", () => {
  it("renders a book at its own address", () => {
    expect(keptBookPath("4674", { id: "4674" })).toBeNull();
    expect(keptBookPath("4674", { id: 4674 })).toBeNull();
  });

  it("sends a merged book's old address to the kept book", () => {
    expect(keptBookPath("5235", { id: "4674" })).toBe("/book/4674");
    expect(keptBookPath("5235", { id: 4674 })).toBe("/book/4674");
  });
});
