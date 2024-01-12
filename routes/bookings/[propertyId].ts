import { getAuthenticatedSession } from "../../lib/http/getAuthenticatedSession";
import { getPropertyBookings } from "../../lib/http/getPropertyBookings";
import { makeBookingsCalendar } from "../../lib/ical";
import { getQuery } from "h3";

export default defineEventHandler(async (event) => {
  const propertyId = event.context.params.propertyId;

  const { email, password } = getQuery(event) as Record<
    "email" | "password",
    string
  >;

  const session = await getAuthenticatedSession({
    email,
    password,
  });

  const bookings = await getPropertyBookings({
    session,
    propertyId,
  });

  const calendar = makeBookingsCalendar(bookings);

  return new Response(calendar.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${
        bookings[0].Property ?? "Unknown Property"
      }.ics"`,
    },
  });
});
