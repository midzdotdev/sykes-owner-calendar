import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { buildCombinedCalendar } from "./calendar";

const loginHtml = readFileSync(new URL("./http/__fixtures__/login-page.html", import.meta.url), "utf8");
const bookingsHtml = readFileSync(new URL("./http/__fixtures__/owner-bookings.html", import.meta.url), "utf8");
const propertiesHtml = readFileSync(new URL("./http/__fixtures__/properties.html", import.meta.url), "utf8");

const respWithUrl = (body: string, url: string) => {
  const res = new Response(body, { status: 200 });
  Object.defineProperty(res, "url", { value: url });
  return res;
};

// Mock the Sykes flow: GET login page, POST login (redirects into the owner
// area = success), GET bookings → the sanitized fixture.
const stubSykes = () =>
  vi.fn(async (url: string, init?: { method?: string }) => {
    const method = (init?.method ?? "GET").toUpperCase();
    if (url.includes("/account/login")) {
      return method === "POST"
        ? respWithUrl("ok", "https://www.sykescottages.co.uk/owner/dashboard")
        : new Response(loginHtml, { status: 200 });
    }
    if (url.endsWith("/owner/bookings")) return new Response(propertiesHtml, { status: 200 });
    if (url.includes("/owner/bookings/")) return new Response(bookingsHtml, { status: 200 });
    throw new Error(`unexpected fetch: ${url}`);
  });

describe("buildCombinedCalendar", () => {
  beforeEach(() => vi.stubGlobal("fetch", stubSykes()));
  afterEach(() => vi.unstubAllGlobals());

  it("builds a calendar for a single property", async () => {
    const cal = await buildCombinedCalendar({
      email: "a@b.com",
      password: "pw",
      propertyIds: ["21953"],
    });
    const ics = cal.toString();
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(4); // fixture has 4 bookings
    expect(ics).toContain("X-WR-CALNAME:Test Cottage");
  });

  it("merges bookings across multiple properties into one calendar", async () => {
    const cal = await buildCombinedCalendar({
      email: "a@b.com",
      password: "pw",
      propertyIds: ["21953", "1146011"],
    });
    const ics = cal.toString();
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(8); // 4 per property
    expect(ics).toContain("X-WR-CALNAME:Sykes Bookings");
    expect(ics).toContain("Test Cottage · "); // events prefixed with their property
  });

  it('resolves "all" to the owner\'s live property list and prefixes events', async () => {
    const cal = await buildCombinedCalendar({
      email: "a@b.com",
      password: "pw",
      propertyIds: "all",
    });
    const ics = cal.toString();
    // properties.html lists 2 properties → 2 × 4 fixture bookings
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(8);
    expect(ics).toContain("X-WR-CALNAME:Sykes Bookings");
    expect(ics).toContain("Test Cottage · ");
  });
});
