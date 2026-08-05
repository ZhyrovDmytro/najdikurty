import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fetchISportSystemAvailability } from "../src/providers/isportsystem/client.js";

describe("fetchISportSystemAvailability", () => {
  it("does not launch a browser unless browser rendering is explicitly enabled", async () => {
    await expect(
      fetchISportSystemAvailability({
        clubSlug: "head-tenis-centrum-vestec",
        date: "2026-08-04",
        fetchImpl: async () =>
          new Response("<html><title>Just a moment...</title><script src=\"https://challenges.cloudflare.com\"></script>", {
            status: 403,
            headers: { "cf-mitigated": "challenge" }
          })
      })
    ).rejects.toThrow("Enable the browser-backed iSportSystem fetcher");
  });

  it("falls back to browser-rendered HTML when direct HTTP is challenged by Cloudflare", async () => {
    const html = readFileSync(new URL("./fixtures/isportsystem-head-teniscentrum.html", import.meta.url), "utf8");

    const result = await fetchISportSystemAvailability({
      clubSlug: "head-tenis-centrum-vestec",
      date: "2026-08-04",
      fetchImpl: async () =>
        new Response("<html><title>Just a moment...</title><script src=\"https://challenges.cloudflare.com\"></script>", {
          status: 403,
          headers: { "cf-mitigated": "challenge" }
        }),
      browser: {
        renderer: async () => ({
          html,
          sourceUrl: "https://teniscentrum.isportsystem.cz/ajax/ajax.schema.php"
        })
      }
    });

    expect(result.sourceUrl).toBe("https://teniscentrum.isportsystem.cz/ajax/ajax.schema.php");
    expect(result.courts).toHaveLength(4);
    expect(result.courts.map((court) => court.court)).toEqual(["Kurt 1", "Kurt 2", "Kurt 3", "Kurt 4"]);
  });
});
