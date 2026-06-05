import { loadCodecFromEnv } from "../../lib/token";
import { getAuthenticatedSession } from "../../lib/http/getAuthenticatedSession";
import { getProperties } from "../../lib/http/getProperties";
import { AuthError, ExtractionError } from "../../lib/errors";

// Given an encrypted credential token, return the owner's properties — or a
// friendly, typed error the web UI can show.
export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  let credentials;
  try {
    credentials = loadCodecFromEnv().decode(body?.token ?? "");
  } catch {
    throw createError({ statusCode: 400, data: { message: "Invalid request." } });
  }

  try {
    const session = await getAuthenticatedSession({
      email: credentials.email,
      password: credentials.password,
    });
    return { properties: await getProperties({ session }) };
  } catch (error) {
    if (error instanceof AuthError) {
      throw createError({ statusCode: 401, data: { message: "That email or password didn't work." } });
    }
    if (error instanceof ExtractionError) {
      throw createError({
        statusCode: 502,
        data: { message: "We couldn't read your account — Sykes may have changed their site." },
      });
    }
    throw createError({ statusCode: 500, data: { message: "Something went wrong. Please try again." } });
  }
});
