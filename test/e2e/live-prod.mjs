// Live monitor: hit the DEPLOYED app and assert it serves a real calendar.
// This catches upstream Sykes breakage (auth failures, markup changes) in
// production — Sykes does not block Vercel's IPs, so no tunnel is needed.
//
//   PROD_URL, SYKES_EMAIL, SYKES_PASSWORD, SYKES_PROPERTY_ID
import { encryptCredentials } from "../../public/crypto.js";

const BASE = process.env.PROD_URL ?? "https://sykes-calendar.midz.dev";
const email = process.env.SYKES_EMAIL;
const password = process.env.SYKES_PASSWORD;
const propertyId = process.env.SYKES_PROPERTY_ID;

const log = (...a) => console.log("[live]", ...a);
const fail = (m) => {
  console.error(`[live] FAIL: ${m}`);
  process.exit(1);
};

if (!email || !password || !propertyId) {
  fail("SYKES_EMAIL / SYKES_PASSWORD / SYKES_PROPERTY_ID are required");
}

log(`checking ${BASE}`);

const pubRes = await fetch(`${BASE}/api/pubkey`);
if (!pubRes.ok) fail(`GET /api/pubkey → ${pubRes.status}`);
const { publicKey } = await pubRes.json();

// Retry on a transient gateway timeout (cold start + a slow Sykes response).
let res, body;
for (let attempt = 1; attempt <= 3; attempt++) {
  const token = await encryptCredentials(publicKey, { email, password, propertyIds: [propertyId] });
  res = await fetch(`${BASE}/c/${token}`);
  body = await res.text();
  if (res.status !== 504) break;
  log(`504 on attempt ${attempt}, retrying…`);
  await new Promise((r) => setTimeout(r, 3000));
}

if (res.status !== 200) fail(`GET /c → expected 200, got ${res.status}`);
if (!(res.headers.get("content-type") || "").includes("text/calendar")) {
  fail(`content-type should be text/calendar, got "${res.headers.get("content-type")}"`);
}
const events = (body.match(/BEGIN:VEVENT/g) || []).length;
if (events < 1) fail(`expected at least one VEVENT, got ${events}`);

log(`production served a valid calendar — ${events} event(s)`);
