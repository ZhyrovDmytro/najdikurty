import { describe, expect, it, vi } from "vitest";
import { fetchISportSystemClubAvailability, isportSystemClubConfig } from "./isportsystem-clubs.js";

describe("configured iSportSystem availability", () => {
  it("combines The Court's standard and 1vs1 categories", async () => {
    const config = isportSystemClubConfig("the-court");
    expect(config).toBeDefined();

    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const sportId = new URL(String(input)).searchParams.get("id_sport");
      const lane = sportId === "12"
        ? { lane_name: "Kurt", lane_id: "70" }
        : { lane_name: "Super 1", lane_id: "1" };
      return new Response(JSON.stringify([{
        ...lane,
        times: { "1789254000": 0 },
        prices: { "1789254000": sportId === "12" ? 300 : 400 },
        event_info: { "1789254000": "" }
      }]), {
        headers: { "content-type": "application/json" },
        status: 200
      });
    });

    const result = await fetchISportSystemClubAvailability({
      clubSlug: "the-court",
      config: config!,
      date: "2026-09-13",
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.sourceUrl).toBe("https://thecourt.isportsystem.cz/");
    expect(result.courts.map(({ court }) => court)).toEqual(["Super 1", "Super Single (1vs1)"]);
  });
});
