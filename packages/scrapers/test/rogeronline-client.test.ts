import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fetchRogerOnlineAvailability } from "../src/providers/rogeronline/client.js";

describe("fetchRogerOnlineAvailability", () => {
  it("requests the RogerOnline schedule for the selected club set and date", async () => {
    const html = readFileSync(new URL("./fixtures/rogeronline-sk-satalice.html", import.meta.url), "utf8");
    let requestedUrl = "";

    const result = await fetchRogerOnlineAvailability({
      clubSlug: "sk-satalice",
      clubId: "197",
      setId: "3",
      date: "2026-08-06",
      fetchImpl: async (input) => {
        requestedUrl = String(input);
        return new Response(html, { headers: { "content-type": "text/html" } });
      }
    });

    expect(requestedUrl).toContain("rok=2026");
    expect(requestedUrl).toContain("mesic=8");
    expect(requestedUrl).toContain("den=6");
    expect(requestedUrl).toContain("klub=197");
    expect(requestedUrl).toContain("set=3");
    expect(result.courts).toHaveLength(2);
  });
});
