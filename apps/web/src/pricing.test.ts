import { describe, expect, it } from "vitest";
import { lowestPrice } from "./pricing";

describe("catalog price minima", () => {
  it("handles both catalog hyphens and typographic ranges without reading dates as prices", () => {
    expect(lowestPrice("1 h: standard 800–1200 Kč; 1vs1 600–800 Kč")).toBe(600);
    expect(lowestPrice("7-16 650-800 Kč; večer 750-900 Kč")).toBe(650);
    expect(lowestPrice("1.10.2026–30.4.2027: 690 Kč")).toBe(690);
  });
  it("keeps an unknown price out of numeric offers", () => {
    expect(lowestPrice("Cenu ověřte v rezervaci.")).toBe(Infinity);
  });
});
