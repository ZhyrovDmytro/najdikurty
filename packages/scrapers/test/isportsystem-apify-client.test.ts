import { describe, expect, it, vi } from "vitest";
import { fetchISportSystemAvailabilityWithApify } from "../src/providers/isportsystem/apify-client.js";

describe("fetchISportSystemAvailabilityWithApify", () => {
  it("runs two week pages together and reuses the batch for every indexed date", async () => {
    const requests: Array<{ url: URL; init?: RequestInit }> = [];
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      requests.push({ url, init });

      if (url.pathname.endsWith("/acts/test-actor/runs")) {
        const actorInput = JSON.parse(String(init?.body));
        expect(actorInput.startUrls).toHaveLength(2);
        expect(actorInput.maxConcurrency).toBe(1);
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-token");
        return jsonResponse({ data: { id: "run-1", defaultDatasetId: "dataset-1", status: "READY" } });
      }
      if (url.pathname.endsWith("/actor-runs/run-1")) {
        return jsonResponse({ data: { status: "SUCCEEDED" } });
      }
      if (url.pathname.endsWith("/datasets/dataset-1/items")) {
        return jsonResponse([
          actorItem("2026-08-25", "Úterý 25.8.", "https://teniscentrum.isportsystem.cz/?op=tab-id-13&day=25&month=8&year=2026"),
          actorItem("2026-08-31", "Pondělí 31.8.", "https://teniscentrum.isportsystem.cz/?op=tab-id-13&day=1&month=9&year=2026")
        ]);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const sharedOptions = {
      actorId: "test-actor",
      apiUrl: "https://retry-api.example.test/v2",
      cacheTtlMs: 60_000,
      clubSlug: "head-tenis-centrum-vestec",
      fetchImpl: fetchImpl as typeof fetch,
      now: new Date("2026-08-25T12:00:00.000Z"),
      token: "test-token"
    };
    const today = await fetchISportSystemAvailabilityWithApify({ ...sharedOptions, date: "2026-08-25" });
    const nextWeek = await fetchISportSystemAvailabilityWithApify({ ...sharedOptions, date: "2026-08-31" });

    expect(today.date).toBe("2026-08-25");
    expect(nextWeek.date).toBe("2026-08-31");
    expect(today.courts).toHaveLength(4);
    expect(nextWeek.courts).toHaveLength(4);
    expect(requests).toHaveLength(3);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("requires an Apify token before making a request", async () => {
    await expect(fetchISportSystemAvailabilityWithApify({
      token: " ",
      clubSlug: "head-tenis-centrum-vestec"
    })).rejects.toThrow("APIFY_TOKEN is required");
  });

  it("retries an anchor page when the Actor returns its timeout error shape", async () => {
    let runNumber = 0;
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.endsWith("/acts/test-actor/runs")) {
        runNumber += 1;
        return jsonResponse({ data: { id: `run-${runNumber}`, defaultDatasetId: `dataset-${runNumber}`, status: "READY" } });
      }
      if (url.pathname.endsWith(`/actor-runs/run-${runNumber}`)) {
        return jsonResponse({ data: { status: "SUCCEEDED" } });
      }
      if (url.pathname.endsWith("/datasets/dataset-1/items")) {
        return jsonResponse([
          {
            url: "https://teniscentrum.isportsystem.cz/?op=tab-id-13&day=25&month=8&year=2026",
            fetchedAt: "2026-08-25T10:00:00.000Z",
            error: "TimeoutError: fetch did not complete within 120s"
          },
          actorItem("2026-08-31", "Pondělí 31.8.", "https://teniscentrum.isportsystem.cz/?op=tab-id-13&day=1&month=9&year=2026")
        ]);
      }
      if (url.pathname.endsWith("/datasets/dataset-2/items")) {
        return jsonResponse([
          actorItem("2026-08-25", "Úterý 25.8.", "https://teniscentrum.isportsystem.cz/?op=tab-id-13&day=25&month=8&year=2026")
        ]);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const result = await fetchISportSystemAvailabilityWithApify({
      actorId: "test-actor",
      apiUrl: "https://api.example.test/v2",
      cacheTtlMs: 0,
      clubSlug: "head-tenis-centrum-vestec",
      date: "2026-08-25",
      fetchImpl: fetchImpl as typeof fetch,
      now: new Date("2026-08-25T12:00:00.000Z"),
      token: "test-token"
    });

    expect(result.date).toBe("2026-08-25");
    expect(result.courts).toHaveLength(4);
    expect(runNumber).toBe(2);
  });
});

function actorItem(date: string, heading: string, url: string) {
  const hourCells = Array.from({ length: 18 }, (_, index) => `${index + 6}:00`);
  const courtCells = Array.from({ length: 36 }, (_, index) => index >= 28 ? "[](#)" : "");
  return {
    url,
    fetchedAt: `${date}T10:00:00.000Z`,
    success: true,
    statusCode: 200,
    fetchTier: "stealth",
    protectionDetected: "none",
    markdown: [
      `### ${heading}`,
      markdownRow(["", ...hourCells]),
      ...Array.from({ length: 4 }, (_, index) => markdownRow([`Kurt ${index + 1}`, ...courtCells]))
    ].join("\n")
  };
}

function markdownRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
