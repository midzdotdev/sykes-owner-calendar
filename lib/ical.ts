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

export const makeBookingsCalendar = (
  bookings: Booking[],
  name?: string,
  opts?: { prefixProperty?: boolean }
) =>
  ical({
    prodId,
    name: name ?? bookings[0]?.Property ?? "Unknown Property",
    events: bookings.map((x) =>
      getBookingICalEventData(x, opts?.prefixProperty ?? false)
    ),
  });

const getBookingICalEventData = (
  booking: Booking,
  // In a combined calendar, prefix each event with its property so the cottages
  // are distinguishable (a single-property calendar is already named after it).
  prefixProperty: boolean
): ICalEventData => {
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

  const summary = isOwnerBooking(booking)
    ? "Owner Booking"
    : `${booking.Name} (${joinRecordEntries({
        adult: booking["Adults"] ?? 0,
        kid: booking["Teenagers and Children"] ?? 0,
        infant: booking["Infants"] ?? 0,
      })})`;

  return {
    id: isOwnerBooking(booking)
      ? booking["Booking Ref"]
      : booking["Booking Ref / PBN"],

    allDay: true,
    start: allDayDate(booking["Arrival Date"]),
    end: allDayDate(booking["Departure Date"]),

    busystatus: isOwnerBooking(booking)
      ? ICalEventBusyStatus.BUSY
      : ICalEventBusyStatus.FREE,

    status:
      booking.Status === "Cancelled"
        ? ICalEventStatus.CANCELLED
        : ICalEventStatus.CONFIRMED,

    summary: prefixProperty ? `${booking.Property} · ${summary}` : summary,

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

// All-day events are date-only. Arrival/Departure are parsed as *local*
// midnight, but ical-generator serialises all-day dates in UTC — so under a
// positive offset (e.g. BST) a local-midnight Date emits the previous day's
// DATE. Re-anchor to UTC midnight using the local calendar components so the
// emitted DATE is the actual booking day on any server timezone.
const allDayDate = (date: Date): Date =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

const dateString = (date: Date): string => datefns.format(date, "do MMM yyyy");

const prettyPrintObject = (o: Record<string, any>): string =>
  Object.entries(o).reduce(
    (acc, [key, value]) => `${acc}${key}: ${value}\n`,
    ""
  );
