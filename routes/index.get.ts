// The owner-facing web UI. A single, framework-free page that encrypts the
// owner's credentials in the browser (public/crypto.js + the server public key),
// lists their properties, and builds a calendar link per property to copy.
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
  label.inline { display:flex; gap:9px; align-items:center; font-weight:500; margin:.9rem 0 0; }
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
  .props { list-style:none; padding:0; margin:.4rem 0 0; }
  .props li { padding:9px 4px; border-bottom:1px solid var(--line); }
  .props label { display:flex; gap:10px; font-weight:500; margin:0; align-items:center; }
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

  <form id="pick" class="card hidden">
    <p class="step">Step 2</p>
    <label>Choose which properties to include</label>
    <ul id="props" class="props"></ul>
    <label class="inline"><input type="checkbox" id="combine" /> Put them all in one calendar instead of one each</label>
    <div class="row" style="margin-top:14px"><button id="make" class="primary" type="submit">Create my links</button></div>
  </form>

  <section id="result" class="card hidden">
    <p class="step">Step 3 — your link<span id="plural">s</span></p>
    <p class="hint">Press <strong>Copy</strong> next to each one and add it to your calendar app (Apple Calendar, Google Calendar, Outlook). <a href="https://help.hospitable.com/en/articles/4605516-how-can-i-add-the-ical-feed-to-the-calendar-on-my-device" target="_blank" rel="noopener">How to add a calendar by link</a>.</p>
    <ul id="links" class="links"></ul>
    <p class="note">Keep these links private — anyone who has one can see those bookings. To turn a link off, change your Sykes password.</p>
  </section>
</main>

<script type="module">
import { encryptCredentials } from "/crypto.js";

const $ = (id) => document.getElementById(id);
let publicKey = null;
let properties = [];

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
    const token = await encryptCredentials(await getPublicKey(), creds());
    const res = await fetch("/api/properties", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.data?.message || "Something went wrong. Please try again.");
    }
    properties = (await res.json()).properties;
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

  const pub = await getPublicKey();
  const c = creds();
  const combine = $("combine").checked;

  // Pre-compute each link so the Copy click can write to the clipboard
  // synchronously (browsers require it inside the user gesture).
  let rows;
  if (combine) {
    const token = await encryptCredentials(pub, { ...c, propertyIds: ids });
    rows = [{ name: "All selected properties", link: \`\${location.origin}/c/\${token}\` }];
  } else {
    rows = await Promise.all(ids.map(async (id) => ({
      name: properties.find((p) => p.id === id)?.name ?? id,
      link: \`\${location.origin}/c/\${await encryptCredentials(pub, { ...c, propertyIds: [id] })}\`,
    })));
  }

  $("plural").textContent = rows.length === 1 ? "" : "s";
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
    btn.addEventListener("click", async () => {
      const li = btn.closest("li");
      try {
        await navigator.clipboard.writeText(rows[+btn.dataset.i].link);
        li.querySelector(".copied").classList.remove("hidden");
      } catch {
        // Clipboard blocked — reveal the link so it can be copied by hand.
        const ta = li.querySelector(".reveal");
        ta.classList.remove("hidden"); ta.select();
      }
    });
  });

  $("result").classList.remove("hidden");
  $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
});
</script>
</body>
</html>`;

export default defineEventHandler((event) => {
  setResponseHeader(event, "content-type", "text/html; charset=utf-8");
  return PAGE;
});
