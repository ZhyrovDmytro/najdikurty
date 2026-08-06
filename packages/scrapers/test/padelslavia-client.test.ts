import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fetchPadelSlaviaAvailability } from "../src/providers/padelslavia/client.js";

describe("fetchPadelSlaviaAvailability", () => {
  it("logs in and fetches the requested dated reservation page", async () => {
    const html = readFileSync(new URL("./fixtures/padelslavia.html", import.meta.url), "utf8");
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const responses = [
      new Response("<form></form>", {
        headers: {
          "set-cookie": "PHPSESSID=first-session; path=/; HttpOnly"
        }
      }),
      new Response("", {
        headers: {
          location: "/cs/rezervace",
          "set-cookie": "PHPSESSID=logged-in-session; path=/; HttpOnly"
        },
        status: 302
      }),
      new Response(html)
    ];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: input.toString(), init });
      const response = responses.shift();
      if (!response) {
        throw new Error("Unexpected extra request");
      }
      return response;
    }) as typeof fetch;

    const result = await fetchPadelSlaviaAvailability({
      baseUrl: "https://rezervace.padelslavia.cz",
      clubSlug: "sk-slavia-praha-padel",
      credentials: {
        email: "player@example.com",
        password: "secret"
      },
      date: "2026-08-05",
      fetchImpl
    });

    expect(result.courts).toHaveLength(4);
    expect(requests.map((request) => request.url)).toEqual([
      "https://rezervace.padelslavia.cz/cs/prihlaseni",
      "https://rezervace.padelslavia.cz/cs/prihlaseni",
      "https://rezervace.padelslavia.cz/cs/rezervace/index/padel/2026-08-05"
    ]);
    expect(requests[1]?.init?.method).toBe("POST");
    expect(String(requests[1]?.init?.body)).toBe("email=player%40example.com&password=secret");
    expect(new Headers(requests[1]?.init?.headers).get("Cookie")).toBe("PHPSESSID=first-session");
    expect(new Headers(requests[2]?.init?.headers).get("Cookie")).toBe("PHPSESSID=logged-in-session");
  });

  it("requires credentials for non-current dates", async () => {
    await expect(
      fetchPadelSlaviaAvailability({
        clubSlug: "sk-slavia-praha-padel",
        date: "2099-01-01",
        fetchImpl: (async () => new Response("")) as typeof fetch
      })
    ).rejects.toThrow("requires login credentials");
  });

  it("does not log in for the public current-day page even when credentials exist", async () => {
    const html = readFileSync(new URL("./fixtures/padelslavia.html", import.meta.url), "utf8");
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: input.toString(), init });
      return new Response(html);
    }) as typeof fetch;

    await fetchPadelSlaviaAvailability({
      baseUrl: "https://rezervace.padelslavia.cz",
      clubSlug: "sk-slavia-praha-padel",
      credentials: {
        email: "player@example.com",
        password: "secret"
      },
      fetchImpl
    });

    expect(requests.map((request) => request.url)).toEqual(["https://rezervace.padelslavia.cz/cs/rezervace"]);
    expect(requests[0]?.init?.method).toBeUndefined();
  });
});
