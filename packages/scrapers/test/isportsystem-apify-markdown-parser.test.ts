import { describe, expect, it } from "vitest";
import { parseISportSystemApifyMarkdown } from "../src/providers/isportsystem/apify-markdown-parser.js";

describe("parseISportSystemApifyMarkdown", () => {
  it("normalizes free half-hour links from the Actor Markdown table", () => {
    const markdown = timetableMarkdown("Úterý 25.8.", [
      [17, 29, 30, 31, 32, 33, 34, 35],
      [14, 15, 16, 17, 18, 24, 30, 31, 32, 33, 34, 35],
      [14, 15, 19, 20, 21, 32, 33, 34, 35],
      [14, 15, 16, 17, 18, 19, 20, 25, 34, 35]
    ]);

    const result = parseISportSystemApifyMarkdown(markdown, {
      sourceUrl: "https://teniscentrum.isportsystem.cz/?op=tab-id-13",
      clubSlug: "head-tenis-centrum-vestec",
      date: "2026-08-25",
      fetchedAt: "2026-08-25T11:16:20.000Z"
    });

    expect(result.dayRange).toEqual({ start: "06:00", end: "24:00" });
    expect(result.slotStepMinutes).toBe(30);
    expect(result.courts.map((court) => court.court)).toEqual(["Kurt 1", "Kurt 2", "Kurt 3", "Kurt 4"]);
    expect(result.courts[0]?.freeSlots).toEqual([
      { start: "14:30", end: "15:00" },
      { start: "20:30", end: "24:00" }
    ]);
    expect(result.courts[1]?.freeSlots).toEqual([
      { start: "13:00", end: "15:30" },
      { start: "18:00", end: "18:30" },
      { start: "21:00", end: "24:00" }
    ]);
  });

  it("rejects an Actor response that does not contain the requested date", () => {
    expect(() => parseISportSystemApifyMarkdown(timetableMarkdown("Úterý 25.8.", [[]]), {
      sourceUrl: "https://teniscentrum.isportsystem.cz/",
      clubSlug: "head-tenis-centrum-vestec",
      date: "2026-08-27"
    })).toThrow("Date 2026-08-27 is not present");
  });
});

function timetableMarkdown(heading: string, freeIndexesByCourt: number[][]): string {
  const hourCells = Array.from({ length: 18 }, (_, index) => `${index + 6}:00`);
  const rows = freeIndexesByCourt.map((freeIndexes, courtIndex) => {
    const free = new Set(freeIndexes);
    const cells = Array.from({ length: 36 }, (_, index) => free.has(index) ? "[](#)" : "");
    return markdownRow([`Kurt ${courtIndex + 1}`, ...cells]);
  });
  return [
    `### ${heading}`,
    markdownRow(["", ...hourCells]),
    ...rows,
    "### Středa 26.8."
  ].join("\n");
}

function markdownRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}
