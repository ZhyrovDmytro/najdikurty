import { describe, expect, it } from "vitest";
import { fetchReenioAvailability } from "../src/providers/reenio/client.js";

describe("fetchReenioAvailability", () => {
  it("posts the Reenio term-list form payload", async () => {
    let requestUrl = "";
    let requestBody = "";
    let requestHeaders: Headers | undefined;

    const result = await fetchReenioAvailability({
      baseUrl: "https://areal-cisarska-louka.reenio.cz",
      clubSlug: "cisarska-louka-padel",
      date: "2026-08-04",
      fetchImpl: async (input, init) => {
        requestUrl = String(input);
        requestBody = String(init?.body);
        requestHeaders = new Headers(init?.headers);

        return new Response(JSON.stringify(termListResponse()), {
          headers: { "content-type": "application/json" }
        });
      }
    });

    expect(requestUrl).toBe("https://areal-cisarska-louka.reenio.cz/cs/api/Term/List");
    expect(requestHeaders?.get("content-type")).toBe("application/x-www-form-urlencoded;charset=UTF-8");
    expect(requestBody).toContain("date=2026-08-04");
    expect(requestBody).toContain("viewMode=7-days");
    expect(requestBody).toContain("filter.resource%5B0%5D.id=48086");
    expect(requestBody).toContain("filter.resource%5B0%5D.type=3");
    expect(result.sourceUrl).toBe("https://areal-cisarska-louka.reenio.cz/cs/service/hriste-padel-48086/2026-08-04;viewMode=7-days");
    expect(result.courts).toHaveLength(3);
  });
});

function termListResponse() {
  return {
    data: {
      events: [
        {
          start: "2026-08-04T07:00:00Z",
          end: "2026-08-04T08:00:00Z",
          maxCapacity: 3,
          reservations: []
        }
      ]
    }
  };
}
