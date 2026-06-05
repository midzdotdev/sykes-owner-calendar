import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { getPropertyBookings } from "./getPropertyBookings";
import type { CustomerBooking } from "../booking-schema";

// Real Sykes owner-bookings DOM, sanitized (see the fixture's header comment).
const html = readFileSync(new URL("./__fixtures__/owner-bookings.html", import.meta.url), "utf8");

const callWith = (cookies: Record<string, string> = {}) =>
  getPropertyBookings({ session: { cookies }, propertyId: "21953" });

describe("getPropertyBookings", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(html, { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the property's bookings page with the serialised session cookie", async () => {
    await callWith({ PHPSESSID: "abc", session_id: "xyz" });
    expect(fetch).toHaveBeenCalledWith(
      "https://www.sykescottages.co.uk/owner/bookings/21953",
      { headers: { cookie: "PHPSESSID=abc; session_id=xyz" } }
    );
  });

  it("parses every booking row from the live DOM structure", async () => {
    const bookings = await callWith();
    expect(bookings).toHaveLength(4);
    expect(bookings.map((b) => b.Status)).toEqual([
      "Confirmed",
      "Confirmed",
      "Confirmed",
      "Confirmed",
    ]);
  });

  it("captures the customer name from the relocated .booking-name-display element", async () => {
    // Regression: Sykes moved the name out of the label/value span pairs into a
    // `.booking-name-and-message-stack` wrapper, which the row selector skips.
    // Before the fix these were all undefined and the schema parse threw.
    const bookings = (await callWith()) as CustomerBooking[];
    expect(bookings.map((b) => b.Name)).toEqual([
      "Mr Alex Morgan",
      "Mrs Sam Taylor",
      "Ms Jamie Lee",
      "Mr Chris Doe",
    ]);
  });

  it("transforms dates, occupancy and contact details on a booking", async () => {
    const [first] = (await callWith()) as CustomerBooking[];
    expect(first["Booking Ref / PBN"]).toBe("5JC4A-25-EN");
    // Local getters: TZ-independent (date-fns parse sets local components).
    expect(first["Arrival Date"].getFullYear()).toBe(2026);
    expect(first["Arrival Date"].getMonth()).toBe(5); // June (0-indexed)
    expect(first["Arrival Date"].getDate()).toBe(5);
    expect(first["Departure Date"].getDate()).toBe(12);
    expect(first.Adults).toBe(2);
    expect(first.Email).toBe("customer1@example.com");
  });

  it("parses teenagers/children occupancy when present", async () => {
    const bookings = (await callWith()) as CustomerBooking[];
    expect(bookings[1]["Teenagers and Children"]).toBe(2);
    expect(bookings[1].Adults).toBe(2);
    expect(bookings[2].Adults).toBe(3);
  });
});
