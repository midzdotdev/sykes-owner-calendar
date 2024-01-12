import * as datefns from "date-fns";
import ical, {
  ICalAttendee,
  ICalAttendeeData,
  ICalAttendeeType,
  ICalCalendar,
  ICalCalendarProdIdData,
  ICalEventBusyStatus,
  ICalEventData,
  ICalEventStatus,
} from "ical-generator";
import { Booking, isOwnerBooking } from "./booking-schema";

const prodId: ICalCalendarProdIdData = {
  company: "midz.dev",
  product: "Sykes Owner's Calendar",
  language: "EN",
};

export const makeBookingsCalendar = (bookings: Booking[]) =>
  ical({
    prodId,
    name: bookings[0].Property ?? "Unknown Property",
    events: bookings.map((x) => getBookingICalEventData(x)),
  });

const getBookingICalEventData = (booking: Booking): ICalEventData => {
  const attendees: ICalAttendeeData[] =
    !isOwnerBooking(booking) && !!booking.Email
      ? [
          {
            type: ICalAttendeeType.INDIVIDUAL,
            name: booking.Name,
            email: booking.Email,
          },
        ]
      : [];

  return {
    id: isOwnerBooking(booking)
      ? booking["Booking Ref"]
      : booking["Booking Ref / PBN"],

    allDay: true,
    start: booking["Arrival Date"],
    end: booking["Departure Date"],

    busystatus: isOwnerBooking(booking)
      ? ICalEventBusyStatus.BUSY
      : ICalEventBusyStatus.FREE,

    status:
      booking.Status === "Cancelled"
        ? ICalEventStatus.CANCELLED
        : ICalEventStatus.CONFIRMED,

    summary: isOwnerBooking(booking)
      ? "Owner Booking"
      : `${booking.Name} (${joinRecordEntries({
          adult: booking["Adults"] ?? 0,
          kid: booking["Teenagers and Children"] ?? 0,
          infant: booking["Infants"] ?? 0,
        })})`,

    attendees,

    description: prettyPrintObject({
      ...booking,
      "Arrival Date": dateString(booking["Arrival Date"]),
      "Departure Date": dateString(booking["Departure Date"]),
    }),
  };
};

const qtyString = (unit: string, qty: number): string =>
  `${qty} ${unit}${qty === 1 ? "" : "s"}`;

const joinRecordEntries = (values: Record<string, number>) =>
  Object.entries(values)
    .filter(([_, qty]) => qty !== 0)
    .map(([unit, qty]) => qtyString(unit, qty))
    .join(", ");

const dateString = (date: Date): string => datefns.format(date, "do MMM yyyy");

const prettyPrintObject = (o: Record<string, any>): string =>
  Object.entries(o).reduce(
    (acc, [key, value]) => `${acc}${key}: ${value}\n`,
    ""
  );
