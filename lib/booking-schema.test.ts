import { describe, expect, it } from "vitest";
import { Booking, CustomerBooking, OwnerBooking, isOwnerBooking } from "./booking-schema";

const ownerRaw = {
  Property: "Sea View Cottage",
  "Booking Ref": "OB-123",
  "Arrival Date": "1st January 2024",
  "Departure Date": "5th January 2024",
  Status: "Owner Booking",
  "Booking Type": "Maintenance",
};

const customerRaw = {
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
};

describe("OwnerBooking", () => {
  it("transforms the date strings into Date objects (local components)", () => {
    const booking = OwnerBooking.parse(ownerRaw);
    expect(booking["Arrival Date"]).toBeInstanceOf(Date);
    // Use local getters: date-fns parse sets local components, so this is TZ-independent.
    expect(booking["Arrival Date"].getFullYear()).toBe(2024);
    expect(booking["Arrival Date"].getMonth()).toBe(0); // January
    expect(booking["Arrival Date"].getDate()).toBe(1);
    expect(booking["Departure Date"].getDate()).toBe(5);
  });

  it("rejects a non-owner status", () => {
    expect(() => OwnerBooking.parse({ ...ownerRaw, Status: "Confirmed" })).toThrow();
  });
});

describe("CustomerBooking", () => {
  it("coerces numeric occupancy fields to numbers", () => {
    const booking = CustomerBooking.parse(customerRaw);
    expect(booking.Adults).toBe(2);
    expect(booking["Teenagers and Children"]).toBe(1);
    expect(booking.Infants).toBe(0);
  });

  it("allows occupancy and contact fields to be omitted", () => {
    const booking = CustomerBooking.parse({
      Property: "Sea View Cottage",
      "Booking Ref / PBN": "CB-789",
      "Arrival Date": "1st June 2024",
      "Departure Date": "8th June 2024",
      Status: "Cancelled",
      Name: "John Smith",
    });
    expect(booking.Adults).toBeUndefined();
    expect(booking.Email).toBeUndefined();
    expect(booking.Status).toBe("Cancelled");
  });
});

describe("Booking union + isOwnerBooking", () => {
  it("discriminates an owner booking", () => {
    const booking = Booking.parse(ownerRaw);
    expect(isOwnerBooking(booking)).toBe(true);
  });

  it("discriminates a customer booking", () => {
    const booking = Booking.parse(customerRaw);
    expect(isOwnerBooking(booking)).toBe(false);
  });
});
