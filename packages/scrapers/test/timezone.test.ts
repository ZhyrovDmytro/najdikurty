import { describe, expect, it } from "vitest";
import { dateKeyInTimezone, localDateRange, localDateTimeInstant } from "../src/domain/timezone.js";

describe("timezone domain helpers", () => {
  it("resolves Prague local dates to UTC in standard and summer time", () => {
    expect(localDateRange("2026-01-15", "Europe/Prague")).toEqual({
      from: new Date("2026-01-14T23:00:00.000Z"),
      to: new Date("2026-01-15T23:00:00.000Z")
    });
    expect(localDateRange("2026-08-04", "Europe/Prague")).toEqual({
      from: new Date("2026-08-03T22:00:00.000Z"),
      to: new Date("2026-08-04T22:00:00.000Z")
    });
  });

  it("preserves 23-hour and 25-hour Prague days across DST transitions", () => {
    const spring = localDateRange("2026-03-29", "Europe/Prague");
    const autumn = localDateRange("2026-10-25", "Europe/Prague");

    expect(spring.to.getTime() - spring.from.getTime()).toBe(23 * 60 * 60_000);
    expect(autumn.to.getTime() - autumn.from.getTime()).toBe(25 * 60 * 60_000);
    expect(dateKeyInTimezone(spring.from, "Europe/Prague")).toBe("2026-03-29");
    expect(dateKeyInTimezone(autumn.from, "Europe/Prague")).toBe("2026-10-25");
  });

  it("rejects invalid calendar dates", () => {
    expect(() => localDateRange("2026-02-30", "Europe/Prague")).toThrow("Invalid calendar date");
  });

  it("resolves local wall-clock times and the 24:00 boundary", () => {
    expect(localDateTimeInstant("2026-08-21", "09:00", "Europe/Prague")).toEqual(
      new Date("2026-08-21T07:00:00Z")
    );
    expect(localDateTimeInstant("2026-01-21", "09:00", "Europe/Prague")).toEqual(
      new Date("2026-01-21T08:00:00Z")
    );
    expect(localDateTimeInstant("2026-08-21", "24:00", "Europe/Prague")).toEqual(
      new Date("2026-08-21T22:00:00Z")
    );
  });
});
