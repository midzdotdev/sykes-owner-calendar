import { SykesSession } from "./getAuthenticatedSession";
import * as cheerio from "cheerio";
import { Booking } from "../booking-schema";
import { z } from "zod";
import { serialiseCookies } from "../utils/cookies";
import { USER_AGENT } from "./constants";

export const getPropertyBookings = async (params: {
  session: SykesSession;
  propertyId: string;
}): Promise<Booking[]> => {
  const bookingsResp = await fetch(
    `https://www.sykescottages.co.uk/owner/bookings/${params.propertyId}`,
    {
      headers: {
        cookie: serialiseCookies(params.session.cookies),
        "user-agent": USER_AGENT,
      },
    }
  );

  const $ = cheerio.load(await bookingsResp.text());

  const rawBookings = $("#booking-list .row")
    .toArray()
    .map((row) => {
      const entries = $(".row-details .col > div:has(> span)", row)
        .toArray()
        .map((el) => [
          $("span:nth-child(1)", el).text().trim(),
          $("span:nth-child(2)", el).text().trim(),
        ]);

      const booking: Record<string, string> = Object.fromEntries(entries);

      // The customer name is no longer a label/value span pair: Sykes moved it
      // into a `.booking-name-and-message-stack` wrapper whose spans are nested
      // deeper, so the selector above skips it. Pull it out separately. Owner
      // bookings have no name element, leaving the key absent (as the schema expects).
      const name = $(".booking-name-display", row).first().text().trim();
      if (name) booking.Name = name;

      return booking;
    });

  return z.array(Booking).parse(rawBookings);
};
