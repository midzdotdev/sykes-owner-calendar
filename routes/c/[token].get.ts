import { loadCodecFromEnv } from "../../lib/token";
import { buildCombinedCalendar } from "../../lib/calendar";

// Calendar feed for an encrypted credential token: /c/<token>
export default defineEventHandler(async (event) => {
  let credentials;
  try {
    credentials = loadCodecFromEnv().decode(getRouterParam(event, "token") ?? "");
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Invalid calendar link" });
  }

  const calendar = await buildCombinedCalendar(credentials);

  return new Response(calendar.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="sykes-bookings.ics"`,
    },
  });
});
