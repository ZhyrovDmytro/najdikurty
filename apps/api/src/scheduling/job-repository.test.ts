import { describe, expect, it } from "vitest";
import { retryDelayMs } from "./job-repository.js";

describe("retryDelayMs", () => {
  it("uses capped exponential backoff with bounded jitter", () => {
    expect(retryDelayMs(1, 1_000, 10_000, () => 0.5)).toBe(1_000);
    expect(retryDelayMs(3, 1_000, 10_000, () => 0.5)).toBe(4_000);
    expect(retryDelayMs(8, 1_000, 10_000, () => 0.5)).toBe(10_000);
    expect(retryDelayMs(2, 1_000, 10_000, () => 0)).toBe(1_600);
    expect(retryDelayMs(2, 1_000, 10_000, () => 1)).toBe(2_400);
  });
});
