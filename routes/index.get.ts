// The owner-facing web UI. A single, framework-free page that encrypts the
// owner's credentials in the browser (public/crypto.js + the server public key),
// lists their properties, and offers either a calendar per property or one
// combined calendar (optionally "all properties, now and in future").
//
// One card that swaps between a sign-in view and a calendars view. Visual
// language mirrors sykescottages.co.uk: deep-navy masthead with a purple
// "bloom" petal motif, royal-blue primary actions, and a magenta accent.
const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sykes Owner Calendar</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  :root {
    --navy:#16273c; --navy-2:#0c1828; --ink:#1a2a3c; --muted:#5d6e7e; --line:#e5eaf1;
    --blue:#2f6fed; --blue-dark:#2159cc; --magenta:#cf1f86; --purple:#8b5cf6;
    --bg:#eef2f7; --card:#ffffff; --ok:#0f8a55; --err:#c4332b;
    --shadow:0 18px 40px -18px rgba(15,32,56,.34);
  }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; color:var(--ink); min-height:100vh;
    font:16px/1.6 "Hanken Grotesk", system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    -webkit-font-smoothing:antialiased;
    background-color:#0c1828;
    background-image:
      radial-gradient(rgba(255,255,255,.075) 1.2px, transparent 1.3px),
      radial-gradient(740px 470px at 6% -12%, rgba(207,31,134,.24) 0%, rgba(207,31,134,0) 66%),
      radial-gradient(1100px 560px at 86% -14%, #2a456b 0%, #182a40 42%, rgba(12,24,40,0) 78%);
    background-size:26px 26px, 100% 740px, 100% 820px;
    background-repeat:repeat, no-repeat, no-repeat;
    background-attachment:fixed, fixed, fixed; }
  .wrap { max-width:660px; margin:0 auto; padding:0 22px; }
  h1, h2, .lname, .logo-text, .acct strong { font-family:"Sora", "Hanken Grotesk", system-ui, sans-serif; }
  a { color:var(--blue); }

  /* ---- Masthead (header + hero, over the page's dark canvas) ---- */
  .masthead { position:relative; color:#fff; }
  @media (max-width:430px){ .logo-text { font-size:.82rem; letter-spacing:.1em; margin-left:10px; padding-left:10px; } }

  .topbar { display:flex; align-items:center; justify-content:space-between; padding:18px 0 4px; }
  .logo { display:inline-flex; align-items:center; color:#fff; text-decoration:none; }
  .logo .mark { width:27px; height:27px; flex:0 0 auto; }
  .logo-text { margin-left:13px; padding:6px 0 6px 13px; border-left:1px solid rgba(255,255,255,.38);
    font-size:.98rem; font-weight:500; letter-spacing:.15em; text-transform:uppercase; line-height:1; white-space:nowrap; }
  .logo-text b { font-weight:800; }
  .navlink { color:rgba(255,255,255,.82); text-decoration:none; font-size:.9rem; font-weight:600;
    border:1px solid rgba(255,255,255,.18); padding:7px 13px; border-radius:999px; transition:.18s; }
  .navlink:hover { background:rgba(255,255,255,.1); color:#fff; }

  .hero { position:relative; padding:34px 0 92px; max-width:560px; }
  .eyebrow { display:inline-block; font-size:.74rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
    color:#ff8fce; margin:0 0 14px; }
  .hero h1 { font-size:clamp(2rem, 5.4vw, 2.85rem); line-height:1.08; font-weight:800; margin:0 0 14px; letter-spacing:-.01em; }
  .hero h1 .hl { background:linear-gradient(transparent 64%, rgba(207,31,134,.6) 64%, rgba(207,31,134,.6) 94%, transparent 94%); padding:0 .04em; }
  .hero .lede { font-size:1.06rem; color:#c4d2e2; margin:0; max-width:30em; }

  /* ---- Content (one card lifts over the masthead) ---- */
  .content { position:relative; padding:0 0 72px; margin-top:-60px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:26px 26px;
    box-shadow:var(--shadow); overflow:hidden; }
  .card h2 { font-size:1.22rem; margin:0 0 1rem; font-weight:700; }

  /* account bar (calendars view) */
  .acctbar { display:flex; align-items:center; gap:12px; margin-bottom:18px; }
  .back { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; padding:0;
    border-radius:11px; background:#eef2f8; color:var(--ink); flex:0 0 auto; }
  .back:hover { background:#e2e9f3; }
  .back svg { width:19px; height:19px; }
  .acct { font-size:.84rem; color:var(--muted); line-height:1.25; }
  .acct strong { display:block; color:var(--ink); font-size:1rem; font-weight:700; word-break:break-all; }

  label { display:block; font-weight:600; margin:1rem 0 .35rem; font-size:.94rem; }
  input[type=email], input[type=password], input[type=text], textarea {
    width:100%; padding:13px 14px; border:1.5px solid var(--line); border-radius:12px; font:inherit; background:#fbfcfe;
    color:var(--ink); transition:border-color .15s, box-shadow .15s; }
  input[type=email]:focus, input[type=password]:focus, input[type=text]:focus, textarea:focus {
    outline:none; border-color:var(--blue); box-shadow:0 0 0 4px rgba(47,111,237,.14); background:#fff; }
  textarea { resize:none; margin-top:10px; font-size:.85rem; color:var(--muted); }
  .pw-wrap { position:relative; }
  .pw-wrap input { padding-right:46px; }
  .pw-toggle { position:absolute; right:6px; top:50%; transform:translateY(-50%); display:inline-flex;
    padding:8px; background:none; border:0; color:var(--muted); cursor:pointer; border-radius:8px; }
  .pw-toggle:hover { color:var(--ink); background:#eef2f8; }
  .pw-toggle svg { width:19px; height:19px; }
  .hint { color:var(--muted); font-size:.88rem; margin:.6rem 0 0; }

  button { font:inherit; font-weight:700; border:0; border-radius:12px; padding:13px 20px; cursor:pointer; transition:.16s; }
  button:disabled { opacity:.5; cursor:default; }
  button.small { padding:9px 15px; font-size:.9rem; border-radius:10px; }
  .primary { background:var(--blue); color:#fff; box-shadow:0 8px 18px -8px rgba(47,111,237,.7); }
  .primary:hover:not(:disabled) { background:var(--blue-dark); transform:translateY(-1px); }
  .primary:active { transform:translateY(0); }
  .ghost { background:#eef2f8; color:var(--ink); }
  .ghost:hover:not(:disabled) { background:#e2e9f3; }
  .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }

  /* ---- Tabs (segmented control) ---- */
  .tabbar { display:flex; background:#eef2f7; border:1px solid var(--line); border-radius:13px; padding:4px; gap:4px; margin:.2rem 0 18px; }
  .tab { flex:1; background:none; color:var(--muted); border-radius:9px; padding:10px 10px; font-weight:700; font-size:.92rem; }
  .tab.active { background:#fff; color:var(--ink); box-shadow:0 2px 6px -1px rgba(20,40,70,.16), inset 0 -2.5px 0 var(--magenta); }
  .tab:hover:not(.active) { color:var(--ink); }
  .tabpanel { animation:fade .35s ease; }

  .links { list-style:none; padding:0; margin:.2rem 0 0; }
  .links li { display:flex; flex-direction:column; gap:0; padding:14px 2px; border-bottom:1px solid var(--line); }
  .links li:last-child { border-bottom:0; }
  .top { display:flex; gap:10px; align-items:center; justify-content:space-between; }
  .lname { font-weight:700; font-size:1.02rem; }
  .copied { color:var(--ok); font-weight:700; font-size:.9rem; display:inline-flex; align-items:center; gap:4px; }

  .includeall { display:flex; gap:11px; align-items:flex-start; background:linear-gradient(180deg,#f1f6ff,#eaf1ff);
    border:1.5px solid #cfe0fb; border-radius:13px; padding:13px 15px; font-weight:700; margin:.3rem 0 .2rem; cursor:pointer; }
  .includeall input { margin-top:3px; flex:0 0 auto; width:17px; height:17px; accent-color:var(--blue); cursor:pointer; }
  .orpick { color:var(--muted); font-size:.8rem; font-weight:700; letter-spacing:.02em; text-transform:uppercase; margin:.9rem 0 .1rem; }
  .orpick.disabled { opacity:.45; }
  .props { list-style:none; padding:0; margin:.2rem 0 .4rem; }
  .props li { padding:8px 2px; }
  .props label { display:flex; gap:10px; align-items:center; font-weight:500; margin:0; font-size:1rem; cursor:pointer; }
  .props label.disabled { opacity:.45; cursor:default; }
  .props input { width:17px; height:17px; accent-color:var(--blue); cursor:pointer; }
  .props input:disabled { cursor:default; }

  .note { background:#fff5fa; border:1px solid #f6cfe4; border-radius:12px; padding:13px 15px; color:#9b1f64; font-size:.88rem; margin-top:18px; }
  .error { color:var(--err); font-weight:600; margin:.9rem 0 0; }
  .hidden { display:none; }
  .foot { text-align:center; color:rgba(255,255,255,.72); font-size:.84rem; margin:22px auto 0; max-width:36em; }
  .foot strong { color:#fff; }
  .foot a { font-weight:600; color:#9cc0ff; }
  .disclaimer { color:rgba(255,255,255,.56); font-size:.78rem; margin-top:9px; }

  @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
  @keyframes swapIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
  @keyframes fade { from { opacity:0; } to { opacity:1; } }
  .reveal-anim { opacity:0; animation:fadeUp .6s cubic-bezier(.2,.7,.2,1) forwards; }
  .swap { animation:swapIn .42s cubic-bezier(.2,.7,.2,1); }
  .d1 { animation-delay:.06s; } .d2 { animation-delay:.15s; } .d3 { animation-delay:.24s; } .d4 { animation-delay:.36s; }
  @media (prefers-reduced-motion: reduce) { * { animation:none !important; } .reveal-anim { opacity:1; } }
</style>
</head>
<body>
  <div class="masthead">
    <div class="wrap">
      <header class="topbar">
        <a class="logo" href="/">
          <svg class="mark" viewBox="0 0 25.28 25.28" fill="currentColor" aria-hidden="true">
            <path d="M118.938,128.417l-1.826-1.819v-3.164a1.053,1.053,0,0,0-2.106,0v1.051l-2.405-2.4a1.051,1.051,0,0,0-1.489,0l-6.337,6.336a1.053,1.053,0,1,0,1.489,1.489l5.592-5.592,5.592,5.592a1.053,1.053,0,1,0,1.489-1.489" transform="translate(-99.221 -113.569)" />
            <path d="M86.426,73.79A12.636,12.636,0,1,0,99.061,86.426,12.636,12.636,0,0,0,86.426,73.79m0,2.106a10.529,10.529,0,1,1-7.445,3.077A10.529,10.529,0,0,1,86.426,75.9" transform="translate(-73.79 -73.79)" />
          </svg>
          <span class="logo-text"><b>Sykes</b> Owner Calendar</span>
        </a>
        <a class="navlink" href="https://github.com/midzdotdev/sykes-owner-calendar" target="_blank" rel="noopener">About</a>
      </header>
      <div class="hero">
        <p class="eyebrow reveal-anim d1">For property owners</p>
        <h1 class="reveal-anim d2">Your bookings, in your own <span class="hl">calendar</span>.</h1>
        <p class="lede reveal-anim d3">Add your Sykes Cottages bookings to the calendar on your phone or computer — set it up once and it stays up to date on its own.</p>
      </div>
    </div>
  </div>

  <main class="content">
    <div class="wrap">
      <div class="card reveal-anim d4">
        <!-- View: sign in -->
        <form id="creds">
          <h2>Sign in to Sykes</h2>
          <label for="email">Your Sykes email</label>
          <input id="email" type="email" autocomplete="username" required />
          <label for="password">Your Sykes password</label>
          <div class="pw-wrap">
            <input id="password" type="password" autocomplete="current-password" required />
            <button type="button" id="pwToggle" class="pw-toggle" aria-label="Show password">
              <svg class="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              <svg class="eye-off hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
            </button>
          </div>
          <p class="hint">Your email and password are encrypted on your device and stay encrypted in transit — only this tool can decrypt them.</p>
          <div class="row" style="margin-top:16px"><button id="find" class="primary" type="submit">Find my properties</button></div>
          <p id="creds-error" class="error hidden"></p>
        </form>

        <!-- View: calendars -->
        <div id="result" class="hidden">
          <div class="acctbar">
            <button type="button" class="back" id="back" aria-label="Use a different account">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div class="acct">Signed in as <strong id="acctEmail"></strong></div>
          </div>
          <h2>Your calendars</h2>
          <p id="noprops" class="hint hidden">We couldn't find any properties on your account. If you have some, please try again shortly.</p>

          <div id="tabs" class="hidden">
            <div class="tabbar" role="tablist">
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
              <div class="top" style="margin-top:10px">
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
        </div>
      </div>

      <p class="foot">This tool only ever <strong>reads</strong> your bookings — it never changes anything in your Sykes account. <a href="https://github.com/midzdotdev/sykes-owner-calendar" target="_blank" rel="noopener">How it works</a>.</p>
      <p class="foot disclaimer">An independent project — not affiliated with, or endorsed by, <a href="https://www.sykescottages.co.uk/" target="_blank" rel="noopener">Sykes Cottages Ltd</a>.</p>
    </div>
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

// Swap the single card between its two views, re-triggering the entrance animation.
function transitionTo(show, hide) {
  hide.classList.add("hidden");
  show.classList.remove("hidden", "swap");
  void show.offsetWidth;
  show.classList.add("swap");
  document.querySelector(".card").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

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

    $("acctEmail").textContent = c.email;
    if (!properties.length) {
      $("noprops").classList.remove("hidden");
      $("tabs").classList.add("hidden");
    } else {
      $("noprops").classList.add("hidden");
      await setupResults(properties);
      $("tabs").classList.remove("hidden");
    }
    transitionTo($("result"), $("creds"));
  } catch (e2) {
    err.textContent = e2.message; err.classList.remove("hidden");
  } finally {
    btn.disabled = false; btn.textContent = "Find my properties";
  }
});

$("back").addEventListener("click", () => transitionTo($("creds"), $("result")));

$("pwToggle").addEventListener("click", () => {
  const pw = $("password");
  const show = pw.type === "password";
  pw.type = show ? "text" : "password";
  $("pwToggle").querySelector(".eye").classList.toggle("hidden", show);
  $("pwToggle").querySelector(".eye-off").classList.toggle("hidden", !show);
  $("pwToggle").setAttribute("aria-label", show ? "Hide password" : "Show password");
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
