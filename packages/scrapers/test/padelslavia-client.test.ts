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

  it("requires credentials when a public non-current date falls back to the active day", async () => {
    const html = readFileSync(new URL("./fixtures/padelslavia.html", import.meta.url), "utf8");
    const requests: Array<{ url: string; init?: RequestInit }> = [];

    await expect(
      fetchPadelSlaviaAvailability({
        baseUrl: "https://rezervace.padelslavia.cz",
        clubSlug: "sk-slavia-praha-padel",
        date: "2099-01-01",
        fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
          requests.push({ url: input.toString(), init });
          return new Response(html);
        }) as typeof fetch
      })
    ).rejects.toThrow("requires login credentials");

    expect(requests.map((request) => request.url)).toEqual([
      "https://rezervace.padelslavia.cz/cs/rezervace/index/padel/2099-01-01"
    ]);
    expect(requests[0]?.init?.method).toBeUndefined();
  });

  it("logs in and fetches the dated page when credentials exist and no date is supplied", async () => {
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

    await fetchPadelSlaviaAvailability({
      baseUrl: "https://rezervace.padelslavia.cz",
      clubSlug: "sk-slavia-praha-padel",
      credentials: {
        email: "player@example.com",
        password: "secret"
      },
      fetchImpl
    });

    expect(requests.map((request) => request.url)).toEqual([
      "https://rezervace.padelslavia.cz/cs/prihlaseni",
      "https://rezervace.padelslavia.cz/cs/prihlaseni",
      expect.stringMatching(/^https:\/\/rezervace\.padelslavia\.cz\/cs\/rezervace\/index\/padel\/\d{4}-\d{2}-\d{2}$/)
    ]);
    expect(requests[1]?.init?.method).toBe("POST");
    expect(new Headers(requests[2]?.init?.headers).get("Cookie")).toBe("PHPSESSID=logged-in-session");
  });

  it("falls back to browser rendering when the public page is rejected", async () => {
    const html = readFileSync(new URL("./fixtures/padelslavia.html", import.meta.url), "utf8");
    const result = await fetchPadelSlaviaAvailability({
      baseUrl: "https://rezervace.padelslavia.cz",
      browser: {
        renderer: async ({ requiresLogin }) => {
          expect(requiresLogin).toBe(false);
          return {
            html,
            sourceUrl: "https://rezervace.padelslavia.cz/cs/rezervace"
          };
        }
      },
      clubSlug: "sk-slavia-praha-padel",
      fetchImpl: (async () => new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })) as typeof fetch
    });

    expect(result.courts).toHaveLength(4);
  });
});
