import { getAuthenticatedSession } from "./http/getAuthenticatedSession";
import { getProperties } from "./http/getProperties";
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

  // "all" → resolve the owner's current properties live, so any property they
  // add later appears automatically without making a new link.
  const propertyIds =
    creds.propertyIds === "all"
      ? (await getProperties({ session })).map((p) => p.id)
      : creds.propertyIds;

  const results = [];
  for (const propertyId of propertyIds) {
    results.push(await getPropertyBookings({ session, propertyId }));
  }
  const bookings = results.flatMap((r) => r.bookings);

  // One property → name the calendar after it (works even with no bookings).
  // Several → a generic title, and prefix each event with its property so the
  // cottages are distinguishable in the merged calendar.
  const combined = propertyIds.length > 1;
  const name = combined
    ? "Sykes Bookings"
    : results[0]?.name ?? results[0]?.bookings[0]?.Property ?? "Sykes Bookings";

  return makeBookingsCalendar(bookings, name, { prefixProperty: combined });
};
