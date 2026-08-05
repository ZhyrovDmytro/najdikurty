import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fetchJdemeNaToAvailability, fetchJdemeNaToPortalSearchAvailability } from "../src/providers/jdemenato/client.js";

describe("fetchJdemeNaToAvailability", () => {
  it("logs in and fetches the authenticated organization calendar date", async () => {
    const html = readFileSync(new URL("./fixtures/jdemenato-tk-sparta.html", import.meta.url), "utf8");
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const responses = [
      new Response("<form></form>", {
        headers: {
          "set-cookie": "JSESSIONID=first-session; Path=/reservation; HttpOnly"
        }
      }),
      new Response("", {
        headers: {
          location: "/reservation/myportalorganizationcalendar;jsessionid=logged-in-session",
          "set-cookie": "JSESSIONID=logged-in-session; Path=/reservation; HttpOnly"
        },
        status: 302
      }),
      new Response(html),
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

    const result = await fetchJdemeNaToAvailability({
      baseUrl: "https://jdemenato.cz",
      clubSlug: "tk-sparta-praha",
      credentials: {
        email: "player@example.com",
        password: "secret"
      },
      date: "2026-08-12",
      fetchImpl,
      sport: "padel"
    });

    expect(result.courts).toHaveLength(2);
    expect(result.sourceUrl).toBe(
      "https://jdemenato.cz/reservation/myportalorganizationcalendar.navigation.daynavigationbar:selectdayinternal/2026-08-12"
    );
    expect(requests.map((request) => request.url)).toEqual([
      "https://jdemenato.cz/reservation/tk-sparta-praha/login",
      "https://jdemenato.cz/reservation/tk-sparta-praha/j_spring_security_check",
      "https://jdemenato.cz/reservation/myportalorganizationcalendar",
      "https://jdemenato.cz/reservation/myportalorganizationcalendar.navigation.daynavigationbar:selectdayinternal/2026-08-12"
    ]);
    expect(requests[1]?.init?.method).toBe("POST");
    expect(String(requests[1]?.init?.body)).toBe("j_password=secret&j_username=player%40example.com");
    expect(new Headers(requests[1]?.init?.headers).get("Cookie")).toBe("JSESSIONID=first-session");
    expect(new Headers(requests[2]?.init?.headers).get("Cookie")).toBe("JSESSIONID=logged-in-session");
  });

  it("uses the browser fallback when enabled and HTTP login is blocked", async () => {
    const html = readFileSync(new URL("./fixtures/jdemenato-tk-sparta.html", import.meta.url), "utf8");
    const responses = [
      new Response("<form></form>", {
        headers: {
          "set-cookie": "JSESSIONID=first-session; Path=/reservation; HttpOnly"
        }
      }),
      new Response("Forbidden", {
        status: 403
      })
    ];
    const fetchImpl = (async () => {
      const response = responses.shift();
      if (!response) {
        throw new Error("Unexpected extra request");
      }
      return response;
    }) as typeof fetch;

    const result = await fetchJdemeNaToAvailability({
      baseUrl: "https://jdemenato.cz",
      browser: {
        enabled: true,
        renderer: async () => ({
          html,
          sourceUrl: "https://jdemenato.cz/reservation/myportalorganizationcalendar"
        })
      },
      clubSlug: "tk-sparta-praha",
      credentials: {
        email: "player@example.com",
        password: "secret"
      },
      date: "2026-08-12",
      fetchImpl,
      sport: "padel"
    });

    expect(result.courts).toHaveLength(2);
    expect(result.sourceUrl).toBe("https://jdemenato.cz/reservation/myportalorganizationcalendar");
  });

  it("uses the browser fallback when the HTTP request times out", async () => {
    const html = readFileSync(new URL("./fixtures/jdemenato-tk-sparta.html", import.meta.url), "utf8");
    const events: string[] = [];
    const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      });
    }) as typeof fetch;

    const result = await fetchJdemeNaToAvailability({
      baseUrl: "https://jdemenato.cz",
      browser: {
        enabled: true,
        httpTimeoutMs: 1,
        logger: (event) => events.push(event),
        renderer: async () => ({
          html,
          sourceUrl: "https://jdemenato.cz/reservation/myportalorganizationcalendar"
        })
      },
      clubSlug: "tk-sparta-praha",
      credentials: {
        email: "player@example.com",
        password: "secret"
      },
      date: "2026-08-12",
      fetchImpl,
      sport: "padel"
    });

    expect(result.courts).toHaveLength(2);
    expect(events).toContain("http.failure");
    expect(events).toContain("browser.fallback.start");
  });

  it("fetches availability through the public portal search timetable", async () => {
    const html = readFileSync(new URL("./fixtures/jdemenato-tk-sparta.html", import.meta.url), "utf8");
    const requests: string[] = [];
    const responses = [
      new Response(`
        <div data-search-result>
          <h2><a>TK Sparta Praha</a></h2>
          <a class="showTimetable" href="/reservation/portalsearch.portalsearchresult:showtimetable/2026-08-12d1?t:ac=172791371_Praha_2026-08-12_0_24_f">Reserve</a>
        </div>
      `),
      new Response(JSON.stringify({ content: html }))
    ];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      requests.push(input.toString());
      const response = responses.shift();
      if (!response) {
        throw new Error("Unexpected extra request");
      }
      return response;
    }) as typeof fetch;

    const result = await fetchJdemeNaToPortalSearchAvailability({
      baseUrl: "https://jdemenato.cz",
      clubSlug: "tk-sparta-praha",
      date: "2026-08-12",
      fetchImpl,
      organizationName: "TK Sparta Praha",
      sport: "padel"
    });

    expect(result.courts).toHaveLength(2);
    expect(requests).toHaveLength(2);
  });
});
