import { describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  ANALYTICS_CONSENT_MAX_AGE_MS,
  clearLegacyPosthogStorage,
  readAnalyticsConsent,
  writeAnalyticsConsent
} from "./analytics-consent";

describe("analytics consent storage", () => {
  it("accepts only the two explicit consent choices", () => {
    expect(readAnalyticsConsent({ getItem: () => JSON.stringify({ choice: "granted", savedAt: 1_000 }) }, 1_000)).toBe("granted");
    expect(readAnalyticsConsent({ getItem: () => JSON.stringify({ choice: "denied", savedAt: 1_000 }) }, 1_000)).toBe("denied");
    expect(readAnalyticsConsent({ getItem: () => "" })).toBeNull();
    expect(readAnalyticsConsent({ getItem: () => "unexpected" })).toBeNull();
  });

  it("asks for a new choice after twelve months", () => {
    const stored = JSON.stringify({ choice: "granted", savedAt: 1_000 });
    expect(readAnalyticsConsent({ getItem: () => stored }, 1_000 + ANALYTICS_CONSENT_MAX_AGE_MS)).toBe("granted");
    expect(readAnalyticsConsent({ getItem: () => stored }, 1_001 + ANALYTICS_CONSENT_MAX_AGE_MS)).toBeNull();
  });

  it("stores the choice under the documented key", () => {
    const setItem = vi.fn();
    writeAnalyticsConsent("denied", { setItem }, 123);
    expect(setItem).toHaveBeenCalledWith(
      ANALYTICS_CONSENT_STORAGE_KEY,
      JSON.stringify({ choice: "denied", savedAt: 123 })
    );
  });

  it("fails closed when storage cannot be read or written", () => {
    expect(readAnalyticsConsent({ getItem: () => { throw new Error("blocked"); } })).toBeNull();
    expect(() => writeAnalyticsConsent("granted", { setItem: () => { throw new Error("blocked"); } })).not.toThrow();
  });

  it("removes only legacy PostHog persistence", () => {
    const keys = ["mamekurt-theme", "ph_project_posthog", "mamekurt-language"];
    const removeItem = vi.fn();
    clearLegacyPosthogStorage({
      key: (index) => keys[index] ?? null,
      length: keys.length,
      removeItem
    });
    expect(removeItem).toHaveBeenCalledOnce();
    expect(removeItem).toHaveBeenCalledWith("ph_project_posthog");
  });
});
