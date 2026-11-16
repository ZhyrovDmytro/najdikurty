import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const url = process.env.SEARCH_TEST_URL ?? "http://127.0.0.1:5173/en/";
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const day = offset => {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};
const indoor = { date: day(1), endDate: day(3), clubSlugs: ["padel-neride", "padel-cakovice"], courtType: "indoor", multisportOnly: true, duration: 90, courtsNeeded: 2, startTime: "18:00", endTime: "22:00" };
const outdoor = { ...indoor, date: day(2), endDate: day(2), clubSlugs: ["padel-club-spoje", "padel-neride"], courtType: "outdoor", multisportOnly: false, duration: 60, courtsNeeded: 1, startTime: "09:00", endTime: "12:00" };
const searches = [
  { id: "indoor", name: "Indoor evenings", params: indoor },
  { id: "outdoor", name: "Outdoor mornings", params: outdoor },
  { id: "expired", name: "Expired range", params: { ...indoor, date: "2000-01-01", endDate: "2000-01-03", clubSlugs: ["padel-prosek"], courtType: "outdoor", multisportOnly: false } }
];
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const requests = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(values => localStorage.setItem("mamekurt-saved-searches", JSON.stringify(values)), searches);
  await page.route("**/api/ready", route => route.fulfill({ json: { ok: true } }));
  await page.route("**/api/search?*", async route => {
    const query = new URL(route.request().url());
    requests.push(query.searchParams);
    const startsAt = new Date(`${day(3)}T17:00:00Z`);
    const results = query.searchParams.get("date") === day(3) ? [1, 2].map(number => ({
      club: { slug: query.searchParams.get("clubs").split(",")[0], timezone: "Europe/Prague" },
      court: { name: `Court ${number}` }, startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + Number(query.searchParams.get("duration")) * 60_000).toISOString(),
      bookingUrl: "https://example.com/book", lastCheckedAt: new Date().toISOString(), freshness: "fresh"
    })) : [];
    await route.fulfill({ json: { results } });
  });
  await page.goto(url);
  const toggle = page.getByRole("button", { name: "Advanced search", exact: true });
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.equal(requests.length, 0, "Restoring filters on page load must not run a search");
  // Deliberately change the current state before loading a saved search.
  await page.locator(".searchField-courtType select").selectOption("outdoor");
  await page.locator(".searchField-startTime select").selectOption("07:00");

  async function useSaved(name, root = page.locator(".savedSearchSidebar")) {
    const before = requests.length;
    await root.getByRole("button", { name: `Use search: ${name}`, exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".resultBar") && !document.querySelector(".searchSubmitButton:disabled"));
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    assert(await page.locator(".searchFeedback").innerText().then(text => text.includes("Running")));
    return requests.slice(before);
  }
  function checkQueries(actual, dates, params, clubs) {
    assert.deepEqual(actual.map(query => query.get("date")).sort(), dates);
    for (const query of actual) {
      assert.equal(query.get("clubs"), clubs);
      assert.equal(query.get("indoor"), String(params.courtType === "indoor"));
      assert.equal(query.get("duration"), String(params.duration));
      assert.equal(query.get("from"), params.startTime);
      assert.equal(query.get("to"), params.endTime);
    }
  }
  checkQueries(await useSaved("Indoor evenings"), [day(1), day(2), day(3)], indoor, "padel-neride");
  assert.equal(await page.locator(".dailySearchResults > section").first().locator(".clubCompactRow").count(), 0);
  assert(await page.getByRole("button", { name: "Select", exact: true }).isVisible(), "Later-day matches must enable slot selection even when the first day is empty");
  await page.getByRole("button", { name: "Show slots", exact: true }).click();
  assert(await page.locator(".dailySearchResults > section").last().locator(".clubCompactSlot").first().isVisible());
  assert.equal(await page.locator(".searchField").filter({ hasText: "Courts needed" }).locator("select").inputValue(), "2");
  checkQueries(await useSaved("Outdoor mornings"), [day(2)], outdoor, "padel-club-spoje");
  assert.equal(await page.locator(".searchField").filter({ hasText: "Courts needed" }).locator("select").inputValue(), "1");
  const expired = await useSaved("Expired range");
  assert(expired.length >= 2);
  for (const query of expired) assert(query.get("date") >= today && query.get("date") <= day(2));
  assert((await page.locator(".searchFeedback").innerText()).includes("dates moved"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Saved searches", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Saved searches", exact: true });
  checkQueries(await useSaved("Indoor evenings", sheet), [day(1), day(2), day(3)], indoor, "padel-neride");
  assert.equal(await sheet.count(), 0);
  const beforeQuickSearch = requests.length;
  await page.getByRole("button", { name: "Tomorrow morning", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector(".searchSubmitButton:disabled"));
  const quick = requests.slice(beforeQuickSearch);
  assert.equal(quick.length, 1, "Quick searches must stay single-day even after a saved range");
  assert.equal(quick[0].get("date"), day(1));
  assert.equal(quick[0].get("from"), "08:00");
  assert.equal(quick[0].get("to"), "12:00");
  assert.deepEqual(errors, []);
  console.log(`Saved-search browser checks passed: ${url}`);
} finally {
  await browser.close();
}
