import { describe, expect, it } from "vitest";
import { hasManualRefreshCompleted, type ManualRefreshStatus } from "./manual-refresh";

const requestedAt = "2026-08-22T08:10:00.000Z";

describe("manual refresh completion", () => {
  it("waits until every requested club has a newer successful refresh", () => {
    const statuses: ManualRefreshStatus[] = [
      { clubSlug: "club-a", lastRefreshAt: "2026-08-22T08:10:05.000Z", status: "pending" },
      { clubSlug: "club-b", lastRefreshAt: "2026-08-22T08:09:00.000Z", status: "running" }
    ];
    expect(hasManualRefreshCompleted(statuses, ["club-a", "club-b"], requestedAt)).toBe(false);
  });

  it("completes after all requested clubs have fresh timestamps", () => {
    const statuses: ManualRefreshStatus[] = [
      { clubSlug: "club-a", lastRefreshAt: "2026-08-22T08:10:05.000Z", status: "pending" },
      { clubSlug: "club-b", lastRefreshAt: "2026-08-22T08:11:00.000Z", status: "pending" }
    ];
    expect(hasManualRefreshCompleted(statuses, ["club-a", "club-b"], requestedAt)).toBe(true);
  });
});
