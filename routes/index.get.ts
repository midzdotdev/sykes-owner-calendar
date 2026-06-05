// The owner-facing web UI. A single, framework-free page that encrypts the
// owner's credentials in the browser (public/crypto.js + the server public key),
// lists their properties, and builds a calendar link to copy.
const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sykes Owner Calendar</title>
<style>
  :root { --ink:#1d2433; --muted:#5b6577; --line:#e3e7ee; --brand:#1f6feb; --bg:#f6f8fb; --ok:#0f7b3f; --err:#b42318; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
    font:16px/1.55 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
  main { max-width:560px; margin:0 auto; padding:32px 20px 64px; }
  h1 { font-size:1.6rem; margin:0 0 .25rem; }
  p.lede { color:var(--muted); margin:.25rem 0 1.5rem; }
  .card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:22px; margin-bottom:18px; }
  label { display:block; font-weight:600; margin:.6rem 0 .3rem; }
  input[type=email], input[type=password], textarea {
    width:100%; padding:11px 12px; border:1px solid var(--line); border-radius:9px; font:inherit; background:#fff; }
  textarea { resize:none; }
  .hint { color:var(--muted); font-size:.86rem; margin:.5rem 0 0; }
  button { font:inherit; font-weight:600; border:0; border-radius:9px; padding:11px 16px; cursor:pointer; }
  .primary { background:var(--brand); color:#fff; }
  .primary:disabled { opacity:.55; cursor:default; }
  .ghost { background:#eef2f8; color:var(--ink); }
  .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .props { list-style:none; padding:0; margin:.4rem 0 0; }
  .props li { padding:9px 4px; border-bottom:1px solid var(--line); }
  .props label { display:flex; gap:10px; font-weight:500; margin:0; align-items:center; }
  .hidden { display:none; }
  .error { color:var(--err); font-weight:500; margin:.8rem 0 0; }
  .note { background:#fff7ed; border:1px solid #fed7aa; border-radius:10px; padding:12px 14px; color:#7c4a03; font-size:.9rem; }
  a { color:var(--brand); }
  .step { font-size:.8rem; letter-spacing:.04em; text-transform:uppercase; color:var(--muted); margin:0 0 .4rem; }
</style>
</head>
<body>
<main>
  <h1>Sykes Owner Calendar</h1>
  <p class="lede">Add your Sykes Cottages bookings to the calendar on your phone or computer, kept up to date automatically.</p>

  <form id="creds" class="card">
    <p class="step">Step 1</p>
    <label for="email">Your Sykes email</label>
    <input id="email" type="email" autocomplete="username" required />
    <label for="password">Your Sykes password</label>
    <input id="password" type="password" autocomplete="current-password" required />
    <p class="hint">Your email and password are encrypted on this device before anything is sent.</p>
    <div class="row" style="margin-top:14px"><button id="find" class="primary" type="submit">Find my properties</button></div>
    <p id="creds-error" class="error hidden"></p>
  </form>

  <form id="pick" class="card hidden">
    <p class="step">Step 2</p>
    <label>Choose which properties to include</label>
    <ul id="props" class="props"></ul>
    <div class="row" style="margin-top:14px"><button id="make" class="primary" type="submit">Create my calendar link</button></div>
  </form>

  <section id="result" class="card hidden">
    <p class="step">Step 3 — your link</p>
    <textarea id="link" rows="3" readonly></textarea>
    <div class="row" style="margin-top:10px">
      <button id="copy" class="ghost" type="button">Copy link</button>
      <span id="copied" class="hidden" style="color:var(--ok);font-weight:600">Copied ✓</span>
    </div>
    <p class="hint">Add this link to your calendar app (Apple Calendar, Google Calendar, Outlook). <a href="https://help.hospitable.com/en/articles/4605516-how-can-i-add-the-ical-feed-to-the-calendar-on-my-device" target="_blank" rel="noopener">How to add a calendar by link</a>.</p>
    <p class="note">Keep this link private — anyone who has it can see your bookings. To disable a link, change your Sykes password.</p>
  </section>
</main>

<script type="module">
import { encryptCredentials } from "/crypto.js";

const $ = (id) => document.getElementById(id);
let publicKey = null;

async function getPublicKey() {
  if (publicKey) return publicKey;
  const r = await fetch("/api/pubkey");
  publicKey = (await r.json()).publicKey;
  return publicKey;
}

const creds = () => ({ email: $("email").value.trim(), password: $("password").value });

$("creds").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("creds-error");
  err.classList.add("hidden");
  const btn = $("find");
  btn.disabled = true; btn.textContent = "Checking…";
  try {
    const token = await encryptCredentials(await getPublicKey(), creds());
    const res = await fetch("/api/properties", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.data?.message || "Something went wrong. Please try again.");
    }
    const { properties } = await res.json();
    $("props").innerHTML = properties.map((p) =>
      \`<li><label><input type="checkbox" name="prop" value="\${p.id}" checked /> \${p.name}</label></li>\`
    ).join("");
    $("pick").classList.remove("hidden");
    $("result").classList.add("hidden");
  } catch (e2) {
    err.textContent = e2.message; err.classList.remove("hidden");
  } finally {
    btn.disabled = false; btn.textContent = "Find my properties";
  }
});

$("pick").addEventListener("submit", async (e) => {
  e.preventDefault();
  const ids = [...document.querySelectorAll('input[name="prop"]:checked')].map((c) => c.value);
  if (!ids.length) return;
  const token = await encryptCredentials(await getPublicKey(), { ...creds(), propertyIds: ids });
  $("link").value = \`\${location.origin}/c/\${token}\`;
  $("result").classList.remove("hidden");
  $("copied").classList.add("hidden");
  $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

$("copy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("link").value); }
  catch { $("link").select(); document.execCommand("copy"); }
  $("copied").classList.remove("hidden");
});
</script>
</body>
</html>`;

export default defineEventHandler((event) => {
  setResponseHeader(event, "content-type", "text/html; charset=utf-8");
  return PAGE;
});
