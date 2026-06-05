import { describe, expect, it } from "vitest";
import { Booking } from "./booking-schema";
import { makeBookingsCalendar } from "./ical";

const bookings = [
  Booking.parse({
    Property: "Sea View Cottage",
    "Booking Ref": "OB-123",
    "Arrival Date": "1st January 2024",
    "Departure Date": "5th January 2024",
    Status: "Owner Booking",
    "Booking Type": "Maintenance",
  }),
  Booking.parse({
    Property: "Sea View Cottage",
    "Booking Ref / PBN": "CB-456",
    "Arrival Date": "12th March 2024",
    "Departure Date": "19th March 2024",
    Status: "Confirmed",
    Name: "Jane Doe",
    Email: "jane@example.com",
    Adults: "2",
    "Teenagers and Children": "1",
    Infants: "0",
  }),
];

// DTSTAMP is set to "now" by ical-generator, so scrub it for a stable snapshot.
const normalise = (ics: string) => ics.replace(/^DTSTAMP:.*$/gm, "DTSTAMP:<scrubbed>");

describe("makeBookingsCalendar", () => {
  it("renders a mixed set of bookings to a stable ICS document", () => {
    const ics = makeBookingsCalendar(bookings).toString();
    expect(normalise(ics)).toMatchSnapshot();
  });

  it("names the calendar after the first booking's property", () => {
    const ics = makeBookingsCalendar(bookings).toString();
    expect(ics).toContain("X-WR-CALNAME:Sea View Cottage");
  });
});
