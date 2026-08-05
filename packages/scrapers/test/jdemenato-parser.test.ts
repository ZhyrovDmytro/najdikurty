import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseJdemeNaToAvailability } from "../src/providers/jdemenato/parser.js";

describe("parseJdemeNaToAvailability", () => {
  it("normalizes TK Sparta court blocks and free slots", () => {
    const html = readFileSync(new URL("./fixtures/jdemenato-tk-sparta.html", import.meta.url), "utf8");
    const result = parseJdemeNaToAvailability(html, {
      sourceUrl: "https://jdemenato.cz/reservation/tk-sparta-praha/reservationcalendaroverview",
      clubSlug: "tk-sparta-praha",
      fetchedAt: "2026-08-04T00:00:00.000Z"
    });

    expect(result.date).toBe("2026-08-04");
    expect(result.sport).toBe("padel");
    expect(result.dayRange).toEqual({
      start: "08:00",
      end: "21:00"
    });
    expect(result.slotStepMinutes).toBe(30);
    expect(result.courts).toHaveLength(2);
    expect(result.courts.map((court) => court.court)).toEqual(["Kurt 1", "Kurt 2"]);
    expect(result.courts[0]?.blocks[0]).toMatchObject({
      start: "08:00",
      end: "16:00",
      status: "closed",
      label: "Bára kemp"
    });
    expect(result.courts[0]?.freeSlots).toEqual([]);
    expect(result.courts[1]?.blocks.at(-1)).toMatchObject({
      start: "19:30",
      end: "21:00",
      status: "occupied"
    });
  });
});
