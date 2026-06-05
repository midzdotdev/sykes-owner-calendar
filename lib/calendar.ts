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

  const bookings = [];
  for (const propertyId of creds.propertyIds) {
    bookings.push(...(await getPropertyBookings({ session, propertyId })));
  }

  // One property → use its name; several → a generic title (each event still
  // names its property in the description).
  const name =
    creds.propertyIds.length === 1
      ? bookings[0]?.Property ?? "Sykes Bookings"
      : "Sykes Bookings";

  return makeBookingsCalendar(bookings, name);
};
