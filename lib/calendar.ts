import { getAuthenticatedSession } from "./http/getAuthenticatedSession";
import { getPropertyBookings } from "./http/getPropertyBookings";
import { makeBookingsCalendar } from "./ical";
import type { Credentials } from "./token";

// Sign in once, fetch the bookings for each selected property, and merge them
// into a single iCalendar document.
export const buildCombinedCalendar = async (creds: Credentials) => {
  const session = await getAuthenticatedSession({
    email: creds.email,
    password: creds.password,
  });

  const results = [];
  for (const propertyId of creds.propertyIds) {
    results.push(await getPropertyBookings({ session, propertyId }));
  }
  const bookings = results.flatMap((r) => r.bookings);

  // One property → name the calendar after it (works even with no bookings);
  // several → a generic title (each event still names its property).
  const name =
    creds.propertyIds.length === 1
      ? results[0]?.name ?? results[0]?.bookings[0]?.Property ?? "Sykes Bookings"
      : "Sykes Bookings";

  return makeBookingsCalendar(bookings, name);
};
