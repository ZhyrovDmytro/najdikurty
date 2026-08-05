import { describe, expect, it } from "vitest";
import { fetchPadelosAvailability } from "../src/providers/padelos/client.js";

describe("fetchPadelosAvailability", () => {
  it("fetches Prague Smichov slots with Padelos company headers and exact durations", async () => {
    let requestUrl = "";
    let requestBody: unknown;
    let requestHeaders: Headers | undefined;

    const result = await fetchPadelosAvailability({
      clubSlug: "padel-powers-smichov",
      date: "2026-08-04",
      fetchImpl: async (input, init) => {
        requestUrl = String(input);
        requestBody = JSON.parse(String(init?.body));
        requestHeaders = new Headers(init?.headers);

        return new Response(JSON.stringify(searchResponse()), {
          headers: { "content-type": "application/json" }
        });
      }
    });

    expect(requestUrl).toBe("https://api.padelos.co/customers/searchByDate");
    expect(requestHeaders?.get("x-clubos-company")).toBe("217");
    expect(requestHeaders?.get("x-clubos-club-info")).toBe("216927");
    expect(requestBody).toMatchObject({ date: "2026-08-04", sport: "padel" });
    expect(result.sourceUrl).toBe("https://player.padelos.co/company/217?clubIds=216927&locale=cs");
    expect(result.minBookingMinutes).toBe(60);
    expect(result.courts).toHaveLength(8);
    expect(result.courts.map((court) => court.court).slice(0, 3)).toEqual(["Kurt 1", "Kurt 2", "Kurt 3"]);
    expect(result.durationAvailability?.["60"]?.[1]?.freeSlots).toEqual([{ start: "22:00", end: "23:00" }]);
    expect(result.durationAvailability?.["60"]?.[5]?.freeSlots).toEqual([
      { start: "22:00", end: "23:00" },
      { start: "23:00", end: "23:59" }
    ]);
    expect(result.durationAvailability?.["120"]?.[5]?.freeSlots).toEqual([{ start: "22:00", end: "23:59" }]);
  });
});

function searchResponse() {
  return {
    success: true,
    data: [
      {
        id: "216927",
        availability: [
          {
            duration: "60",
            slots: [
              {
                startTime: "21:30",
                endTime: "22:30",
                courts: [{ id: "60032" }]
              },
              {
                startTime: "22:00",
                endTime: "23:00",
                courts: [{ id: "60031" }, { id: "60035" }]
              },
              {
                startTime: "23:00",
                endTime: "23:59",
                courts: [{ id: "60035" }]
              }
            ]
          },
          {
            duration: "120",
            slots: [
              {
                startTime: "22:00",
                endTime: "23:59",
                courts: [{ id: "60035" }]
              }
            ]
          }
        ]
      }
    ]
  };
}
