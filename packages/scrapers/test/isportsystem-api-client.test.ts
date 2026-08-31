import { describe, expect, it } from "vitest";
import { fetchISportSystemApiAvailability } from "../src/providers/isportsystem/api-client.js";

const at = (iso: string) => String(Date.parse(iso) / 1_000);

describe("fetchISportSystemApiAvailability", () => {
  it("reads the public API, filters courts, and converts Prague timestamps", async () => {
    let requestedUrl = "";
    const result = await fetchISportSystemApiAvailability({
      baseUrl: "https://plechovka.isportsystem.cz/",
      clubSlug: "plechovka-dubec",
      sportId: "20",
      date: "2026-08-31",
      courtNames: ["Kurt 1", "Kurt 2"],
      fetchedAt: "2026-08-30T12:00:00.000Z",
      fetchImpl: async (input) => {
        requestedUrl = String(input);
        return Response.json([
          {
            lane_name: "Kurt 1",
            lane_id: "102",
            times: {
              [at("2026-08-31T05:00:00Z")]: 0,
              [at("2026-08-31T05:30:00Z")]: 0,
              [at("2026-08-31T06:00:00Z")]: 1,
              [at("2026-08-31T06:30:00Z")]: 1,
              [at("2026-08-31T07:00:00Z")]: 0
            },
            prices: {
              [at("2026-08-31T05:00:00Z")]: 380,
              [at("2026-08-31T05:30:00Z")]: 380,
              [at("2026-08-31T06:00:00Z")]: 380,
              [at("2026-08-31T06:30:00Z")]: 380,
              [at("2026-08-31T07:00:00Z")]: 380
            },
            event_info: {
              [at("2026-08-31T06:00:00Z")]: "Obsazeno",
              [at("2026-08-31T06:30:00Z")]: "Obsazeno"
            }
          },
          {
            lane_name: "Kurt 2",
            lane_id: "103",
            times: {
              [at("2026-08-31T05:00:00Z")]: 1,
              [at("2026-08-31T05:30:00Z")]: 1
            },
            event_info: {
              [at("2026-08-31T05:00:00Z")]: "Zavřeno",
              [at("2026-08-31T05:30:00Z")]: "Zavřeno"
            }
          },
          {
            lane_name: "Náhradník 1",
            lane_id: "108",
            times: { [at("2026-08-31T05:00:00Z")]: 0 }
          }
        ]);
      }
    });

    expect(requestedUrl).toBe(
      "https://plechovka.isportsystem.cz/api/get-times.php?date=20260831&id_sport=20"
    );
    expect(result).toMatchObject({
      clubSlug: "plechovka-dubec",
      date: "2026-08-31",
      dayRange: { start: "07:00", end: "09:30" },
      slotStepMinutes: 30,
      minBookingMinutes: 60,
      fetchedAt: "2026-08-30T12:00:00.000Z"
    });
    expect(result.courts.map(({ court }) => court)).toEqual(["Kurt 1", "Kurt 2"]);
    expect(result.courts[0].freeSlots).toEqual([
      { start: "07:00", end: "08:00" },
      { start: "09:00", end: "09:30" }
    ]);
    expect(result.courts[0].blocks).toEqual([
      { start: "08:00", end: "09:00", status: "occupied", label: "Obsazeno" }
    ]);
    expect(result.courts[0].slotPrices).toMatchObject({ "07:00": 380, "07:30": 380, "09:00": 380 });
    expect(result.courts[0].currency).toBe("CZK");
    expect(result.courts[1].blocks).toEqual([
      { start: "07:00", end: "08:00", status: "closed", label: "Zavřeno" }
    ]);
  });

  it("fails safely when the configured courts are missing", async () => {
    await expect(fetchISportSystemApiAvailability({
      baseUrl: "https://plechovka.isportsystem.cz",
      clubSlug: "plechovka-dubec",
      sportId: "20",
      date: "2026-08-31",
      courtNames: ["Kurt 1"],
      fetchImpl: async () => Response.json([])
    })).rejects.toThrow("No iSportSystem API courts found");
  });
});
