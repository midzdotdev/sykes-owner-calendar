// End-to-end smoke test: boots the BUILT Nitro server (.output/server/index.mjs)
// and verifies it serves valid calendars over HTTP.
//
//   SMOKE_MODE=fixture (default) — outbound Sykes calls are mocked from fixtures
//                                  (offline, no credentials). Checks the legacy
//                                  route, the web UI page, and the /c token feed.
//   SMOKE_MODE=live               — hits the real Sykes site with real credentials
//                                  from SYKES_EMAIL / SYKES_PASSWORD / SYKES_PROPERTY_ID.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as sleep } from "node:timers/promises";
import { generateKeyPairSync, createPublicKey } from "node:crypto";
import { encryptCredentials } from "../../public/crypto.js";

const MODE = process.env.SMOKE_MODE ?? "fixture";
const PORT = Number(process.env.PORT ?? 3987);
const BASE = `http://127.0.0.1:${PORT}`;
const propertyId = process.env.SYKES_PROPERTY_ID ?? "21953";
const email = process.env.SYKES_EMAIL ?? "smoke@example.com";
const password = process.env.SYKES_PASSWORD ?? "smoke-password";

const serverEntry = new URL("../../.output/server/index.mjs", import.meta.url);
const log = (...a) => console.log("[smoke]", ...a);
const assert = (cond, msg) => {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
};

if (MODE === "live" && (!process.env.SYKES_EMAIL || !process.env.SYKES_PASSWORD)) {
  console.error("[smoke] live mode requires SYKES_EMAIL and SYKES_PASSWORD");
  process.exit(2);
}

// An ephemeral token keypair so the built server can decrypt /c links and serve
// /api/pubkey during the test (the real key lives only in production).
const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const tokenPrivatePem = privateKey.export({ type: "pkcs8", format: "pem" });
const tokenJwk = createPublicKey(privateKey).export({ format: "jwk" });
const tokenPublicRaw = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(tokenJwk.x, "base64url"),
  Buffer.from(tokenJwk.y, "base64url"),
]).toString("base64url");

// In fixture mode, preload the fetch mock into the server process. In live mode
// the mock is never added — and we strip it from any inherited NODE_OPTIONS as
// well, so a live run can never have its HTTP calls (auth included) mocked.
const mockImport = `--import ${new URL("./mock-sykes.mjs", import.meta.url).href}`;
const inheritedNodeOptions = (process.env.NODE_OPTIONS ?? "")
  .replace(/--import[= ]\S*mock-sykes\.mjs/g, "")
  .trim();
const nodeOptions = [inheritedNodeOptions, MODE === "fixture" ? mockImport : ""]
  .filter(Boolean)
  .join(" ");

const child = spawn(process.execPath, [serverEntry.pathname], {
  env: {
    ...process.env,
    PORT: String(PORT),
    NITRO_PORT: String(PORT),
    NODE_OPTIONS: nodeOptions,
    TOKEN_PRIVATE_KEY: tokenPrivatePem,
  },
  stdio: ["ignore", "inherit", "inherit"],
});

async function waitForServer(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited early (code ${child.exitCode})`);
    try {
      const r = await fetch(`${BASE}/`, { redirect: "manual" });
      if (r.status) return;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error("server did not become ready within timeout");
}

let failed = false;
try {
  log(`mode=${MODE}, booting built server at ${BASE}`);
  await waitForServer();

  // Legacy plaintext route (still supported).
  const url = `${BASE}/bookings/${encodeURIComponent(propertyId)}?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
  log(`GET /bookings/${propertyId}`);
  const res = await fetch(url);
  const body = await res.text();

  assert(res.status === 200, `expected 200, got ${res.status}`);
  assert(
    (res.headers.get("content-type") || "").includes("text/calendar"),
    `content-type should be text/calendar, got "${res.headers.get("content-type")}"`
  );
  assert(body.startsWith("BEGIN:VCALENDAR"), "body should be an iCalendar document");
  assert(body.includes("END:VCALENDAR"), "VCALENDAR should be closed");
  const events = (body.match(/BEGIN:VEVENT/g) || []).length;
  assert(events >= 1, `expected at least one VEVENT, got ${events}`);
  log(`legacy route served a valid ICS with ${events} event(s)`);

  if (MODE === "fixture") {
    assert(events === 4, `fixture should yield 4 events, got ${events}`);
    assert(body.includes("customer1@example.com"), "fixture attendee email should be present");

    // Web UI page.
    log("GET /");
    const home = await fetch(`${BASE}/`);
    const homeBody = await home.text();
    assert(home.status === 200, `/ expected 200, got ${home.status}`);
    assert(homeBody.includes("Find my properties"), "/ should serve the owner form");

    // Token feed: encrypt a token client-side, then fetch /c/<token>.
    const token = await encryptCredentials(tokenPublicRaw, {
      email: "x@y.com",
      password: "pw",
      propertyIds: [propertyId],
    });
    log("GET /c/<token>");
    const feed = await fetch(`${BASE}/c/${token}`);
    const feedBody = await feed.text();
    assert(feed.status === 200, `/c expected 200, got ${feed.status}`);
    assert(
      (feed.headers.get("content-type") || "").includes("text/calendar"),
      "/c content-type should be text/calendar"
    );
    const feedEvents = (feedBody.match(/BEGIN:VEVENT/g) || []).length;
    assert(feedEvents === 4, `/c should yield 4 events, got ${feedEvents}`);
    assert(feedBody.includes("customer1@example.com"), "/c attendee email should be present");
    log(`web UI + token feed OK (${feedEvents} events)`);
  }

  log("PASS");
} catch (err) {
  failed = true;
  console.error(`[smoke] FAIL: ${err.message}`);
} finally {
  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), sleep(3000)]);
}

process.exit(failed ? 1 : 0);
