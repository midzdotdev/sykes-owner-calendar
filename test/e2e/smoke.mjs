// End-to-end smoke test: boots the BUILT Nitro server (.output/server/index.mjs)
// and verifies it serves a valid ICS calendar over HTTP from the /bookings/:id
// endpoint.
//
//   SMOKE_MODE=fixture (default) — outbound Sykes calls are mocked from fixtures
//                                  (offline, no credentials). Asserts exact output.
//   SMOKE_MODE=live               — hits the real Sykes site with real credentials
//                                  from SYKES_EMAIL / SYKES_PASSWORD / SYKES_PROPERTY_ID.
//                                  Asserts a structurally valid calendar.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as sleep } from "node:timers/promises";

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

// In fixture mode, preload the fetch mock into the server process.
const nodeOptions = [
  process.env.NODE_OPTIONS,
  MODE === "fixture"
    ? `--import ${new URL("./mock-sykes.mjs", import.meta.url).href}`
    : "",
]
  .filter(Boolean)
  .join(" ");

const child = spawn(process.execPath, [serverEntry.pathname], {
  env: { ...process.env, PORT: String(PORT), NITRO_PORT: String(PORT), NODE_OPTIONS: nodeOptions },
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
  log(`served a valid ICS with ${events} event(s)`);

  if (MODE === "fixture") {
    assert(events === 4, `fixture should yield 4 events, got ${events}`);
    assert(body.includes("customer1@example.com"), "fixture attendee email should be present");
    assert(
      (res.headers.get("content-disposition") || "").includes('Test Cottage.ics'),
      "content-disposition filename should come from the property name"
    );
    log("fixture-specific assertions passed");
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
