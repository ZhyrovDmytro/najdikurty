import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseISportSystemAvailability } from "../src/providers/isportsystem/parser.js";

describe("parseISportSystemAvailability", () => {
  it("normalizes the Head Tenis Centrum weekly timetable into four padel courts", () => {
    const html = readFileSync(new URL("./fixtures/isportsystem-head-teniscentrum.html", import.meta.url), "utf8");
    const result = parseISportSystemAvailability(html, {
      sourceUrl: "https://teniscentrum.isportsystem.cz/?op=tab-id-13",
      clubSlug: "head-tenis-centrum-vestec",
      date: "2026-08-04",
      fetchedAt: "2026-08-04T00:00:00.000Z"
    });

    expect(result.date).toBe("2026-08-04");
    expect(result.dayRange).toEqual({ start: "06:00", end: "24:00" });
    expect(result.slotStepMinutes).toBe(30);
    expect(result.courts).toHaveLength(4);
    expect(result.courts.map((court) => court.court)).toEqual(["Kurt 1", "Kurt 2", "Kurt 3", "Kurt 4"]);
    expect(result.courts[0]?.freeSlots).toContainEqual({ start: "14:00", end: "15:30" });
    expect(result.courts[0]?.freeSlots).toContainEqual({ start: "21:00", end: "24:00" });
    expect(result.courts[1]?.freeSlots).toContainEqual({ start: "11:30", end: "16:00" });
    expect(result.courts[3]?.freeSlots).toContainEqual({ start: "23:00", end: "24:00" });
  });

  it("selects Plechovka sport 20 and keeps only the three standard courts", () => {
    const html = `
      <div class="schemaFullContainer">
        <div data-id_sport="20" data-date="2026-08-27"></div>
        <table class="schema_sport_20">
          <thead><tr class="times"><th></th><td colspan="2">8:00</td><td colspan="2">9:00</td></tr></thead>
          <tbody>
            ${courtRow("Kurt 1", true)}
            ${courtRow("Kurt 2", false)}
            ${courtRow("Kurt 3", true)}
            ${courtRow("Náhradník 1", true)}
          </tbody>
        </table>
      </div>
      <div class="schemaFullContainer">
        <div data-id_sport="21" data-date="2026-08-27"></div>
        <table class="schema_sport_21"><tbody>${courtRow("Kurt 1", true)}</tbody></table>
      </div>`;
    const result = parseISportSystemAvailability(html, {
      sourceUrl: "https://plechovka.isportsystem.cz/?op=tab-id-20",
      clubSlug: "plechovka-dubec",
      date: "2026-08-27",
      sportId: "20",
      courtNames: ["Kurt 1", "Kurt 2", "Kurt 3"]
    });

    expect(result.courts.map((court) => court.court)).toEqual(["Kurt 1", "Kurt 2", "Kurt 3"]);
    expect(result.courts[0]?.freeSlots).toEqual([{ start: "08:00", end: "10:00" }]);
    expect(result.courts[1]?.freeSlots).toEqual([]);
  });
});

function courtRow(name: string, free: boolean): string {
  const cell = free ? '<td colspan="4"><a class="empty"></a></td>' : '<td colspan="4" class="booked"></td>';
  return `<tr><th>${name}</th>${cell}</tr>`;
}
