import { describe, expect, it } from "vitest";
import { buildShareText, type ShareableSlot } from "./slot-share";

describe("buildShareText", () => {
  it("groups selected times by club and date", () => {
    const slots: ShareableSlot[] = [
      slot("sparta-1", "TK Sparta", "2026-09-05", "09:00", "10:00"),
      slot("sparta-2", "TK Sparta", "2026-09-05", "10:00", "11:00"),
      slot("prosek-1", "Padel Prosek", "2026-09-05", "18:00", "19:00")
    ];

    expect(buildShareText(slots)).toBe(
      "TK Sparta — 2026-09-05: 09:00-10:00, 10:00-11:00\nhttps://example.com\n" +
      "Padel Prosek — 2026-09-05: 18:00-19:00\nhttps://example.com"
    );
  });
});

function slot(id: string, clubName: string, date: string, start: string, end: string): ShareableSlot {
  return { id, clubName, date, start, end, courtNames: ["Court 1"], bookingUrl: "https://example.com" };
}
