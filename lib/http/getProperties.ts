import * as cheerio from "cheerio";
import { SykesSession } from "./getAuthenticatedSession";
import { serialiseCookies } from "../utils/cookies";
import { USER_AGENT } from "./constants";
import { ExtractionError } from "../errors";

export type Property = { id: string; name: string };

// List the properties an owner manages, from the property dropdown on the
// bookings page (served without an id).
export const getProperties = async (params: {
  session: SykesSession;
}): Promise<Property[]> => {
  const resp = await fetch("https://www.sykescottages.co.uk/owner/bookings", {
    headers: {
      cookie: serialiseCookies(params.session.cookies),
      "user-agent": USER_AGENT,
    },
  });

  const $ = cheerio.load(await resp.text());

  // A missing selector means the page structure changed — that's an extraction
  // failure. A present-but-empty selector means the owner genuinely has no
  // properties, which we return as an empty list (handled gracefully by the UI).
  const selector = $("#property-selector");
  if (selector.length === 0) {
    throw new ExtractionError("Property list not found — the Sykes page may have changed");
  }

  return selector
    .find("option")
    .toArray()
    .map((el) => {
      const id = ($(el).attr("value") ?? "").trim();
      const text = $(el).text().trim();
      // Sykes labels options as "<id> <name>" — show just the name.
      const name = text.replace(new RegExp(`^${id}\\s+`), "").trim() || text;
      return { id, name };
    })
    .filter((p) => /^\d+$/.test(p.id)); // numeric ids = real properties (skips "All Properties")
};
