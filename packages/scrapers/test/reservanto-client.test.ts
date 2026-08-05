import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fetchReservantoAvailability } from "../src/providers/reservanto/client.js";

describe("fetchReservantoAvailability", () => {
  it("posts the Reservanto calendar form for the requested week", async () => {
    const calendarHtml = readFileSync(new URL("./fixtures/reservanto-padel-neride.html", import.meta.url), "utf8");
    let postedPayload: URLSearchParams | undefined;

    const result = await fetchReservantoAvailability({
      clubSlug: "padel-neride",
      date: "2026-08-04",
      fetchImpl: async (input, init) => {
        const url = String(input);

        if (url.includes("/form/")) {
          return new Response(formHtml(), {
            headers: {
              "set-cookie": "__Host-Booknow_SessionId=test-session; path=/; secure; HttpOnly"
            }
          });
        }

        postedPayload = new URLSearchParams(String(init?.body));
        return new Response(calendarHtml, { headers: { "content-type": "text/html" } });
      }
    });

    expect(postedPayload?.get("BookingServiceViewModel.BookingServiceId")).toBe("99005");
    expect(postedPayload?.get("BookingTimeViewModel.LastMondayDay")).toBe("3");
    expect(postedPayload?.get("BookingTimeViewModel.LastMondayMonth")).toBe("8");
    expect(postedPayload?.get("BookingTimeViewModel.LastMondayYear")).toBe("2026");
    expect(result.courts).toHaveLength(3);
  });
});

function formHtml(): string {
  return `
    <form id="BookingModel">
      <input name="BookingServiceViewModel.MerchantId" value="22277" />
      <input name="BookingServiceViewModel.BookingServiceId" value="99006" />
      <input name="BookingTimeViewModel.LastMondayDay" value="0" />
      <input name="BookingTimeViewModel.LastMondayMonth" value="0" />
      <input name="BookingTimeViewModel.LastMondayYear" value="0" />
    </form>
  `;
}
