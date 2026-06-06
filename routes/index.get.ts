// The owner-facing web UI. A single, framework-free page that encrypts the
// owner's credentials in the browser (public/crypto.js + the server public key),
// lists their properties, and gives a copyable calendar link for each.
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
  textarea { resize:none; margin-top:8px; }
  .hint { color:var(--muted); font-size:.86rem; margin:.5rem 0 0; }
  button { font:inherit; font-weight:600; border:0; border-radius:9px; padding:11px 16px; cursor:pointer; }
  button.small { padding:7px 12px; font-size:.9rem; }
  .primary { background:var(--brand); color:#fff; }
  .primary:disabled { opacity:.55; cursor:default; }
  .ghost { background:#eef2f8; color:var(--ink); }
  .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .links { list-style:none; padding:0; margin:.4rem 0 0; }
  .links li { padding:11px 4px; border-bottom:1px solid var(--line); }
  .links .top { display:flex; gap:10px; align-items:center; justify-content:space-between; }
  .links .lname { font-weight:600; }
  .copied { color:var(--ok); font-weight:600; font-size:.9rem; }
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

  <section id="result" class="card hidden">
    <p class="step">Step 2 — your calendars</p>
    <p class="hint">You get a separate calendar for each property. Press <strong>Copy</strong> next to one and add it to your calendar app (Apple Calendar, Google Calendar, Outlook). <a href="https://help.hospitable.com/en/articles/4605516-how-can-i-add-the-ical-feed-to-the-calendar-on-my-device" target="_blank" rel="noopener">How to add a calendar by link</a>.</p>
    <ul id="links" class="links"></ul>
    <p class="note">Keep these links private — anyone who has one can see that property's bookings. To turn a link off, change your Sykes password.</p>
  </section>
</main>

<script type="module">
import { encryptCredentials } from "/crypto.js";

const $ = (id) => document.getElementById(id);
let publicKey = null;

async function getPublicKey() {
  if (!publicKey) publicKey = (await (await fetch("/api/pubkey")).json()).publicKey;
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
    const pub = await getPublicKey();
    const c = creds();
    const res = await fetch("/api/properties", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: await encryptCredentials(pub, c) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.data?.message || "Something went wrong. Please try again.");
    }
    const properties = (await res.json()).properties;

    // Pre-compute a calendar link per property now — not in the Copy handler — so
    // the click can write to the clipboard synchronously, inside the user gesture.
    const rows = await Promise.all(properties.map(async (p) => ({
      name: p.name,
      link: \`\${location.origin}/c/\${await encryptCredentials(pub, { ...c, propertyIds: [p.id] })}\`,
    })));
    renderLinks(rows);
    $("result").classList.remove("hidden");
    $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (e2) {
    err.textContent = e2.message; err.classList.remove("hidden");
  } finally {
    btn.disabled = false; btn.textContent = "Find my properties";
  }
});

function renderLinks(rows) {
  $("links").innerHTML = rows.map((r, i) => \`
    <li>
      <div class="top">
        <span class="lname">\${r.name}</span>
        <span class="row">
          <button type="button" class="ghost small copy" data-i="\${i}">Copy</button>
          <span class="copied hidden">Copied ✓</span>
        </span>
      </div>
      <textarea class="reveal hidden" rows="3" readonly>\${r.link}</textarea>
    </li>\`).join("");

  $("links").querySelectorAll("button.copy").forEach((btn) => {
    let timer;
    btn.addEventListener("click", async () => {
      const li = btn.closest("li");
      try {
        await navigator.clipboard.writeText(rows[+btn.dataset.i].link);
        const copied = li.querySelector(".copied");
        copied.classList.remove("hidden");
        clearTimeout(timer);
        timer = setTimeout(() => copied.classList.add("hidden"), 2000);
      } catch {
        // Clipboard blocked — reveal the link so it can be copied by hand.
        const ta = li.querySelector(".reveal");
        ta.classList.remove("hidden"); ta.select();
      }
    });
  });
}
</script>
</body>
</html>`;

export default defineEventHandler((event) => {
  setResponseHeader(event, "content-type", "text/html; charset=utf-8");
  return PAGE;
});
