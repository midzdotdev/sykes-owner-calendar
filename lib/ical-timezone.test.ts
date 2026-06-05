// Regression guard for the all-day timezone off-by-one. Forces Europe/London,
// where a summer (BST, +1) booking parsed as local midnight would serialise to
// the *previous* day's DATE in UTC unless the all-day date is re-anchored.
// CI runs in UTC (offset 0), so without forcing a timezone this bug is invisible.
process.env.TZ = "Europe/London";

import { describe, expect, it } from "vitest";

describe("makeBookingsCalendar — all-day dates survive a +offset timezone", () => {
  it("emits a summer (BST) arrival on its actual date, not the day before", async () => {
    const { Booking } = await import("./booking-schema");
    const { makeBookingsCalendar } = await import("./ical");

    const booking = Booking.parse({
      Property: "Test Cottage",
      "Booking Ref / PBN": "5JC4A-25-EN",
      "Arrival Date": "5th June 2026",
      "Departure Date": "12th June 2026",
      Status: "Confirmed",
      Name: "Alex Morgan",
      Adults: "2",
    });

    const ics = makeBookingsCalendar([booking]).toString();
    expect(ics).toContain("DTSTART;VALUE=DATE:20260605");
    expect(ics).toContain("DTEND;VALUE=DATE:20260612");
  });
});
