// The owner-facing web UI. A single, framework-free page that encrypts the
// owner's credentials in the browser (public/crypto.js + the server public key),
// lists their properties, and offers either a calendar per property or one
// combined calendar (optionally "all properties, now and in future").
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
  button:disabled { opacity:.55; cursor:default; }
  .primary { background:var(--brand); color:#fff; }
  .ghost { background:#eef2f8; color:var(--ink); }
  .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .tabbar { display:flex; gap:4px; border-bottom:1px solid var(--line); margin-bottom:16px; }
  .tab { background:none; color:var(--muted); border-radius:0; padding:9px 12px; margin-bottom:-1px; border-bottom:2px solid transparent; }
  .tab.active { color:var(--ink); border-bottom-color:var(--brand); }
  .tabpanel { animation:none; }
  .links { list-style:none; padding:0; margin:.4rem 0 0; }
  .links li { padding:11px 4px; border-bottom:1px solid var(--line); }
  .top { display:flex; gap:10px; align-items:center; justify-content:space-between; }
  .lname { font-weight:600; }
  .props { list-style:none; padding:0; margin:.2rem 0 .6rem; }
  .props li { padding:7px 2px; }
  .props label { display:flex; gap:9px; align-items:center; font-weight:500; margin:0; }
  .props label.disabled { opacity:.5; }
  .includeall { display:flex; gap:10px; align-items:flex-start; background:#eef4ff; border:1px solid #d4e2fb;
    border-radius:10px; padding:11px 13px; font-weight:600; margin:.2rem 0 .4rem; cursor:pointer; }
  .includeall input { margin-top:3px; flex:0 0 auto; }
  .orpick { color:var(--muted); font-size:.82rem; font-weight:600; margin:.6rem 0 0; }
  .orpick.disabled { opacity:.5; }
  .copied { color:var(--ok); font-weight:600; font-size:.9rem; }
  .hidden { display:none; }
  .error { color:var(--err); font-weight:500; margin:.8rem 0 0; }
  .note { background:#fff7ed; border:1px solid #fed7aa; border-radius:10px; padding:12px 14px; color:#7c4a03; font-size:.9rem; margin-top:16px; }
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
    <p id="noprops" class="hint hidden">We couldn't find any properties on your account. If you have some, please try again shortly.</p>

    <div id="tabs" class="hidden">
      <div class="tabbar">
        <button type="button" class="tab active" data-tab="individual">A calendar per property</button>
        <button type="button" class="tab" data-tab="combined">One combined calendar</button>
      </div>

      <div class="tabpanel" data-panel="individual">
        <p class="hint">A separate calendar for each property. Press <strong>Copy</strong> and add it to your calendar app (Apple Calendar, Google Calendar, Outlook). <a href="https://help.hospitable.com/en/articles/4605516-how-can-i-add-the-ical-feed-to-the-calendar-on-my-device" target="_blank" rel="noopener">How to add a calendar by link</a>.</p>
        <ul id="links" class="links"></ul>
      </div>

      <div class="tabpanel hidden" data-panel="combined">
        <p class="hint">One calendar with every property's bookings together — each event is labelled with its property.</p>
        <label class="includeall"><input type="checkbox" id="includeAll" checked /> Include all my properties (now and any I add later)</label>
        <p class="orpick" id="orpick">Or choose specific properties</p>
        <ul id="combinedProps" class="props"></ul>
        <div class="top">
          <span class="lname">Combined calendar</span>
          <span class="row">
            <button type="button" class="ghost small" id="copyCombined">Copy</button>
            <span id="copiedCombined" class="copied hidden">Copied ✓</span>
          </span>
        </div>
        <textarea id="combinedReveal" class="reveal hidden" rows="3" readonly></textarea>
      </div>

      <p class="note">Keep these links private — anyone who has one can see those bookings. To turn a link off, change your Sykes password.</p>
    </div>
  </section>
</main>

<script type="module">
import { encryptCredentials } from "/crypto.js";

const $ = (id) => document.getElementById(id);
let publicKey = null;
let pub = null;          // cached server public key
let c = null;            // cached credentials { email, password }
let combinedLink = null; // current combined link, or null when nothing is selected

async function getPublicKey() {
  if (!publicKey) publicKey = (await (await fetch("/api/pubkey")).json()).publicKey;
  return publicKey;
}
const creds = () => ({ email: $("email").value.trim(), password: $("password").value });
const linkFor = async (propertyIds) =>
  \`\${location.origin}/c/\${await encryptCredentials(pub, { ...c, propertyIds })}\`;

$("creds").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("creds-error");
  err.classList.add("hidden");
  const btn = $("find");
  btn.disabled = true; btn.textContent = "Checking…";
  try {
    pub = await getPublicKey();
    c = creds();
    const res = await fetch("/api/properties", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: await encryptCredentials(pub, c) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.data?.message || "Something went wrong. Please try again.");
    }
    const properties = (await res.json()).properties;

    if (!properties.length) {
      $("noprops").classList.remove("hidden");
      $("tabs").classList.add("hidden");
    } else {
      $("noprops").classList.add("hidden");
      await setupResults(properties);
      $("tabs").classList.remove("hidden");
    }
    $("result").classList.remove("hidden");
    $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (e2) {
    err.textContent = e2.message; err.classList.remove("hidden");
  } finally {
    btn.disabled = false; btn.textContent = "Find my properties";
  }
});

async function setupResults(properties) {
  // Individual tab: one pre-computed link per property (so Copy is synchronous).
  const rows = await Promise.all(
    properties.map(async (p) => ({ name: p.name, link: await linkFor([p.id]) }))
  );
  renderIndividual(rows);

  // Combined tab: a checkbox per property; "include all" disables + checks them.
  $("combinedProps").innerHTML = properties.map((p) =>
    \`<li><label><input type="checkbox" class="cprop" value="\${p.id}" checked /> \${p.name}</label></li>\`
  ).join("");
  $("combinedProps").querySelectorAll(".cprop").forEach((cb) =>
    cb.addEventListener("change", recomputeCombined)
  );
  $("includeAll").checked = true;
  syncIncludeAll();
  await recomputeCombined();
}

$("includeAll").addEventListener("change", () => { syncIncludeAll(); recomputeCombined(); });

function syncIncludeAll() {
  const all = $("includeAll").checked;
  $("orpick").classList.toggle("disabled", all);
  $("combinedProps").querySelectorAll(".cprop").forEach((cb) => {
    if (all) cb.checked = true;
    cb.disabled = all;
    cb.closest("label").classList.toggle("disabled", all);
  });
}

async function recomputeCombined() {
  const all = $("includeAll").checked;
  const ids = all
    ? "all"
    : [...$("combinedProps").querySelectorAll(".cprop:checked")].map((cb) => cb.value);
  const copyBtn = $("copyCombined");
  if (!all && ids.length === 0) {
    combinedLink = null;
    copyBtn.disabled = true;
    return;
  }
  combinedLink = await linkFor(ids);
  $("combinedReveal").value = combinedLink;
  copyBtn.disabled = false;
}

function renderIndividual(rows) {
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
        const ta = li.querySelector(".reveal");
        ta.classList.remove("hidden"); ta.select();
      }
    });
  });
}

// Combined Copy — uses the link pre-computed on each selection change.
let combinedTimer;
$("copyCombined").addEventListener("click", async () => {
  if (!combinedLink) return;
  try {
    await navigator.clipboard.writeText(combinedLink);
    const copied = $("copiedCombined");
    copied.classList.remove("hidden");
    clearTimeout(combinedTimer);
    combinedTimer = setTimeout(() => copied.classList.add("hidden"), 2000);
  } catch {
    const ta = $("combinedReveal");
    ta.classList.remove("hidden"); ta.select();
  }
});

// Tabs
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const name = tab.dataset.tab;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".tabpanel").forEach((p) =>
      p.classList.toggle("hidden", p.dataset.panel !== name)
    );
  });
});
</script>
</body>
</html>`;

export default defineEventHandler((event) => {
  setResponseHeader(event, "content-type", "text/html; charset=utf-8");
  return PAGE;
});
