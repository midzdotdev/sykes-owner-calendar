import { SykesSession } from "./getAuthenticatedSession";
import * as cheerio from "cheerio";
import { Booking } from "../booking-schema";
import { z } from "zod";
import { serialiseCookies } from "../utils/cookies";

export const getPropertyBookings = async (params: {
  session: SykesSession;
  propertyId: string;
}): Promise<Booking[]> => {
  const bookingsResp = await fetch(
    `https://www.sykescottages.co.uk/owner/bookings/${params.propertyId}`,
    {
      headers: {
        cookie: serialiseCookies(params.session.cookies),
      },
    }
  );

  const $ = cheerio.load(await bookingsResp.text());

  const rawBookings = $("#booking-list .row")
    .toArray()
    .map((el) => {
      const entries = $(".row-details .col > div:has(> span)", el).toArray();

      return entries.map((el) => [
        $("span:nth-child(1)", el).text().trim(),
        $("span:nth-child(2)", el).text().trim(),
      ]);
    })
    .map((entries) => Object.fromEntries(entries));

  return z.array(Booking).parse(rawBookings);
};
