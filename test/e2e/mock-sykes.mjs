// Preloaded via `node --import` before the built Nitro server starts, in
// fixture mode only. It replaces global fetch so the server's outbound calls to
// Sykes are served from the sanitized fixtures — letting the smoke test exercise
// the full built endpoint over HTTP without network access or credentials.
import { readFileSync } from "node:fs";

const fxDir = new URL("../../lib/http/__fixtures__/", import.meta.url);
const loginHtml = readFileSync(new URL("login-page.html", fxDir), "utf8");
const bookingsHtml = readFileSync(new URL("owner-bookings.html", fxDir), "utf8");

const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  const method = (init?.method ?? "GET").toUpperCase();

  if (url.includes("sykescottages.co.uk/account/login")) {
    if (method === "POST") return new Response("ok", { status: 200 });
    return new Response(loginHtml, {
      status: 200,
      headers: { "set-cookie": "PHPSESSID=e2e-smoke; Path=/; HttpOnly" },
    });
  }

  if (url.includes("sykescottages.co.uk/owner/bookings/")) {
    return new Response(bookingsHtml, { status: 200 });
  }

  return realFetch(input, init);
};
