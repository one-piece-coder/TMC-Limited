import {
  CATALOG,
  HAZARD_TEXT,
  SAFETY_BASICS,
  findAppliance,
  guideUrl,
  findRepair,
  searchCatalog,
  youtubeEmbedUrl,
  youtubeSearchUrl,
} from "./data/catalog.js";
import { FALLBACK_RETAILERS, cleanItemName, partQuery, shopLinks } from "./data/parts.js";

const view = document.getElementById("view");
const DIFFICULTY = { 1: "Easy", 2: "Moderate", 3: "Advanced" };

let config = { aiEnabled: false, billingEnabled: false, freeScansPerMonth: 3, retailers: FALLBACK_RETAILERS };
let user = null;
let userLoaded = false; // true once we know whether someone is signed in

// ---------- API ----------

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: method === "GET" ? {} : { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Something went wrong.");
    Object.assign(err, { status: res.status, code: data.code, data });
    throw err;
  }
  return data;
}

async function refreshUser() {
  try {
    user = (await api("/api/me")).user;
  } catch {
    user = null;
  }
  userLoaded = true;
  updateAccountNav();
  return user;
}

function updateAccountNav() {
  const link = document.querySelector('[data-nav="account"]');
  if (link) link.textContent = user ? (user.plan === "pro" ? "Account · Pro" : "Account") : "Sign in";
  // Owners get a Dashboard link in the menu.
  let dash = document.querySelector('[data-nav="admin"]');
  if (user?.isOwner && !dash) {
    dash = Object.assign(document.createElement("a"), { href: "#/admin", textContent: "Dashboard" });
    dash.dataset.nav = "admin";
    link?.before(dash);
  } else if (!user?.isOwner && dash) dash.remove();
}

// ---------- the business that owns this site ----------

const DEFAULT_BRAND = { businessName: "FixIt Home", tagline: "DIY home repair, made simple", logoEmoji: "🔧", bookingEnabled: true };
const brand = () => ({ ...DEFAULT_BRAND, ...(config.brand || {}) });
const telHref = (phone) => `tel:${String(phone).replace(/[^0-9+]/g, "")}`;
const canBook = () => brand().bookingEnabled || Boolean(brand().phone);

function applyBrand() {
  const b = brand();
  document.querySelectorAll("[data-brand-name]").forEach((el) => (el.textContent = b.businessName));
  const mark = document.querySelector(".brand-mark");
  if (mark) mark.textContent = b.logoEmoji;
  const contact = document.getElementById("footer-contact");
  if (contact) {
    contact.innerHTML = [
      b.phone && `<a href="${telHref(b.phone)}">📞 ${esc(b.phone)}</a>`,
      b.contactEmail && `<a href="mailto:${esc(b.contactEmail)}">${esc(b.contactEmail)}</a>`,
      b.serviceArea && `Serving ${esc(b.serviceArea)}`,
    ]
      .filter(Boolean)
      .join(" · ");
  }
}

// "Rather have a pro fix it?" box that sends work to the business.
function proBox({ applianceId = "", repairId = "", heading = "Rather have a pro fix it?" } = {}) {
  if (!canBook()) return "";
  const b = brand();
  const params = new URLSearchParams({ ...(applianceId && { appliance: applianceId }), ...(repairId && { repair: repairId }) });
  return `<section class="card pro-card book-box">
    <h3>🧑‍🔧 ${esc(heading)}</h3>
    <p style="margin:0">${esc(b.businessName)}${b.serviceArea ? ` serves ${esc(b.serviceArea)}` : " can help"}${b.services ? `: ${esc(b.services.charAt(0).toLowerCase() + b.services.slice(1))}` : ""}.</p>
    <div class="guide-cta" style="margin-top:12px">
      ${b.bookingEnabled ? `<a class="btn" href="#/book?${params}">Request service</a>` : ""}
      ${b.phone ? `<a class="btn secondary" href="${telHref(b.phone)}">📞 Call ${esc(b.phone)}</a>` : ""}
    </div>
  </section>`;
}

// ---------- helpers ----------

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const storage = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — progress just won't persist */
    }
  },
};

// Projects live in localStorage and, when signed in, are synced to the account.
const getProjects = () => storage.get("fixit.projects", {});
const saveProjects = (p) => storage.set("fixit.projects", p);
const projectKey = (a, r) => `${a}/${r}`;

function putProject(project) {
  saveProjects({ ...getProjects(), [projectKey(project.applianceId, project.repairId)]: project });
  if (user) {
    api(`/api/projects/${project.applianceId}/${project.repairId}`, { method: "PUT", body: project }).catch(() => {});
  }
}

function removeProject(key) {
  const all = getProjects();
  delete all[key];
  saveProjects(all);
  if (user) api(`/api/projects/${key}`, { method: "DELETE" }).catch(() => {});
}

// Merge local and account projects (newest wins), then push local-only/newer ones up.
async function syncProjects() {
  if (!user) return;
  try {
    const { projects: remote } = await api("/api/projects");
    const local = getProjects();
    const merged = { ...local };
    for (const p of remote) {
      if (!merged[p.key] || merged[p.key].updated < p.updated) {
        merged[p.key] = { applianceId: p.applianceId, repairId: p.repairId, done: p.done, updated: p.updated };
      }
    }
    saveProjects(merged);
    const remoteByKey = Object.fromEntries(remote.map((p) => [p.key, p]));
    for (const [key, p] of Object.entries(merged)) {
      if (!remoteByKey[key] || remoteByKey[key].updated < p.updated) {
        api(`/api/projects/${key}`, { method: "PUT", body: p }).catch(() => {});
      }
    }
  } catch {
    /* offline — local copy still works */
  }
}

// Where to send the user after they sign in (e.g. back to the scanner).
function rememberAfterLogin(hash) {
  try {
    sessionStorage.setItem("fixit.afterLogin", hash);
  } catch {
    /* ignore */
  }
}
function takeAfterLogin() {
  try {
    const v = sessionStorage.getItem("fixit.afterLogin");
    sessionStorage.removeItem("fixit.afterLogin");
    return v;
  } catch {
    return null;
  }
}

// Model numbers remembered per appliance, used to find exact-fit parts.
const getModels = () => storage.get("fixit.models", {});
const setModel = (applianceId, info) => storage.set("fixit.models", { ...getModels(), [applianceId]: info });

const AFFILIATE_NOTE = `<p class="muted small-print">We may earn a commission from purchases made through these links, at no extra cost to you.</p>`;

function partsHtml(parts, ctx) {
  if (!parts.length) return `<p class="muted">No parts needed.</p>`;
  return `<ul class="shop-list">${parts
    .map((p) => {
      const links = shopLinks(partQuery(p, ctx), config.retailers);
      return `<li><span>${esc(p)}</span><span class="shop-links">${links
        .map((l) => `<a class="btn small secondary" href="${esc(l.url)}" target="_blank" rel="sponsored noopener">Buy · ${esc(l.retailer)}</a>`)
        .join("")}</span></li>`;
    })
    .join("")}</ul>`;
}

function toolsHtml(tools) {
  return `<ul class="shop-list">${tools
    .map((t) => {
      const [link] = shopLinks(cleanItemName(t), config.retailers);
      return `<li><span>${esc(t)}</span>${link ? `<a class="shop-link" href="${esc(link.url)}" target="_blank" rel="sponsored noopener">Shop</a>` : ""}</li>`;
    })
    .join("")}</ul>`;
}

function difficultyPill(d) {
  return `<span class="pill d${d}">${DIFFICULTY[d]}</span>`;
}

function repairMeta(r) {
  return `<div class="meta">${difficultyPill(r.difficulty)}<span class="pill">⏱ ${esc(r.time)}</span><span class="pill">💲 ${esc(r.cost)}</span>${r.videos.length ? `<span class="pill">▶ ${r.videos.length} video${r.videos.length > 1 ? "s" : ""}</span>` : ""}</div>`;
}

function repairCard(appliance, repair) {
  return `<a class="card repair-item" href="#/repair/${appliance.id}/${repair.id}">
    <div><h3>${esc(repair.symptom)}</h3><div class="muted">${appliance.icon} ${esc(appliance.name)} · ${esc(repair.cause)}</div>${repairMeta(repair)}</div>
    <span aria-hidden="true">›</span>
  </a>`;
}

function videoBlock(v) {
  if (v.youtubeId) {
    return `<div class="stack"><div class="video-frame"><iframe src="${youtubeEmbedUrl(v.youtubeId)}" title="${esc(v.title)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><strong>${esc(v.title)}</strong></div>`;
  }
  return `<a class="card video-link" href="${youtubeSearchUrl(v.query)}" target="_blank" rel="noopener">
    <span class="video-thumb" aria-hidden="true">▶</span>
    <span><strong>${esc(v.title)}</strong><br><span class="muted">Watch tutorials on YouTube</span></span>
  </a>`;
}

// ---------- routing ----------

function currentRoute() {
  const [path, qs = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const parts = path.split("/").filter(Boolean);
  return { name: parts[0] || "home", params: parts.slice(1).map(decodeURIComponent), query: new URLSearchParams(qs) };
}

function render() {
  const { name, params } = currentRoute();
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const active = a.dataset.nav === name || (a.dataset.nav === "browse" && ["appliance", "repair"].includes(name));
    a.classList.toggle("active", active);
  });
  const views = { home, identify, browse, appliance, repair, saved, search, account, forgot, reset, book, setup, admin, verify };
  (views[name] || home)(...params);
}

// Navigate, re-rendering even when the target is the page we're already on.
function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

window.addEventListener("hashchange", () => {
  render();
  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
});

// ---------- views ----------

const CATEGORY_TONE = { Kitchen: "orange", Laundry: "blue", Utility: "red", HVAC: "teal", Plumbing: "violet" };

function home() {
  const repairCount = CATALOG.reduce((n, a) => n + a.repairs.length, 0);
  view.innerHTML = `
    <section class="hero hero-bold">
      <div class="hero-art" aria-hidden="true">🔧🪛🧰</div>
      <p class="eyebrow">${esc(brand().tagline)}</p>
      <h1>Fix it yourself. Save the service call.</h1>
      <p>Snap a photo to identify your appliance, get repair suggestions matched to the problem, and follow along with video tutorials.</p>
      <form class="search" id="home-search" role="search">
        <label class="sr-only" for="q">Describe the problem</label>
        <input id="q" type="search" placeholder="Describe the problem, e.g. “dryer not heating”" />
        <button class="btn btn-light" type="submit">Find repairs</button>
      </form>
      <div class="hero-stats">
        <span><strong>${CATALOG.length}</strong> appliances</span>
        <span><strong>${repairCount}</strong> step-by-step guides</span>
        <span><strong>Free</strong> to browse</span>
      </div>
    </section>

    <div class="feature-row">
      <a class="card feature tone-blue" href="#/identify"><div class="feature-icon">📷</div><h3>Identify an appliance</h3><p class="muted">Upload a photo and we'll tell you what it is, the brand and model if visible, and likely fixes.</p></a>
      <a class="card feature tone-green" href="#/browse"><div class="feature-icon">🛠️</div><h3>Browse repair guides</h3><p class="muted">Step-by-step guides with tools, parts, cost and difficulty for common breakdowns.</p></a>
      <a class="card feature tone-violet" href="#/saved"><div class="feature-icon">📋</div><h3>Track your projects</h3><p class="muted">Check off steps as you go and pick up where you left off.</p></a>
    </div>

    <h2>What needs fixing?</h2>
    <div class="tile-row">
      ${CATALOG.map(
        (a) => `<a class="tile tone-${CATEGORY_TONE[a.category] || "orange"}" href="#/appliance/${a.id}"><span class="tile-icon">${a.icon}</span><span>${esc(a.name)}</span></a>`,
      ).join("")}
    </div>

    ${canBook() ? `<div style="margin-top:24px">${proBox({ heading: "Rather have a pro do it?" })}</div>` : ""}

    <h2>Popular quick fixes</h2>
    <div class="list">
      ${CATALOG.flatMap((a) => a.repairs.filter((r) => r.difficulty === 1).slice(0, 1).map((r) => repairCard(a, r)))
        .slice(0, 5)
        .join("")}
    </div>`;
  view.querySelector("#home-search").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = view.querySelector("#q").value.trim();
    if (q) go(`#/search/${encodeURIComponent(q)}`);
  });
}

function search(query = "") {
  const results = searchCatalog(query);
  view.innerHTML = `
    <h1>Repairs for “${esc(query)}”</h1>
    <form class="search" id="search-form" role="search">
      <label class="sr-only" for="q2">Search</label>
      <input id="q2" type="search" value="${esc(query)}" />
      <button class="btn" type="submit">Search</button>
    </form>
    <h2>${results.length} match${results.length === 1 ? "" : "es"}</h2>
    <div class="list">${results.map((r) => repairCard(r.appliance, r.repair)).join("") || `<p class="muted">No guides matched. Try different words, or <a href="#/identify">identify the appliance from a photo</a>.</p>`}</div>`;
  view.querySelector("#search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = view.querySelector("#q2").value.trim();
    if (q) go(`#/search/${encodeURIComponent(q)}`);
  });
}

function browse() {
  const categories = [...new Set(CATALOG.map((a) => a.category))];
  view.innerHTML = `
    <h1>Repair guides</h1>
    <p class="muted">Pick your appliance to see common problems and how to fix them.</p>
    ${categories
      .map(
        (c) => `<h2>${esc(c)}</h2><div class="grid">${CATALOG.filter((a) => a.category === c)
          .map(
            (a) =>
              `<a class="card" href="#/appliance/${a.id}"><div class="icon">${a.icon}</div><h3>${esc(a.name)}</h3><div class="muted">${a.repairs.length} guides</div></a>`,
          )
          .join("")}</div>`,
      )
      .join("")}`;
}

function appliance(id) {
  const a = findAppliance(id);
  if (!a) return notFound();
  view.innerHTML = `
    <div class="breadcrumb"><a href="#/browse">Repairs</a> › ${esc(a.name)}</div>
    <h1>${a.icon} ${esc(a.name)}</h1>
    <div class="notice warn"><strong>Before you start:</strong><ul>${a.hazards.map((h) => `<li>${esc(HAZARD_TEXT[h])}</li>`).join("")}</ul></div>
    <h2>What's going wrong?</h2>
    <div class="list">${a.repairs.map((r) => repairCard(a, r)).join("")}</div>
    <h2>Finding your model number</h2>
    <ul>${a.identifyHints.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
    <div style="margin-top:20px">${proBox({ applianceId: a.id, heading: `Need ${a.name.toLowerCase()} repair?` })}</div>`;
}

function repair(applianceId, repairId) {
  const a = findAppliance(applianceId);
  const r = findRepair(applianceId, repairId);
  if (!a || !r) return notFound();
  const key = projectKey(a.id, r.id);
  const projects = getProjects();
  const project = projects[key];
  const done = new Set(project?.done || []);

  view.innerHTML = `
    <div class="breadcrumb"><a href="#/browse">Repairs</a> › <a href="#/appliance/${a.id}">${esc(a.name)}</a></div>
    <h1>${esc(r.symptom)}</h1>
    <p class="muted">${a.icon} ${esc(a.name)} · Likely cause: ${esc(r.cause)}</p>
    ${repairMeta(r)}
    <div style="margin:16px 0; display:flex; gap:8px; flex-wrap:wrap">
      <button class="btn" id="save-btn">${project ? "✓ Saved to My Projects" : "Start this project"}</button>
      ${r.videos[0] ? `<a class="btn secondary" href="#videos">▶ Watch tutorial</a>` : ""}
      <button class="btn secondary" id="share-btn" type="button">🔗 Share guide</button>
    </div>

    <div class="notice warn"><strong>Safety first</strong><ul>${a.hazards.map((h) => `<li>${esc(HAZARD_TEXT[h])}</li>`).join("")}</ul></div>

    <div class="two-col" style="margin-top:16px">
      <div class="card"><h3>🧰 Tools</h3>${toolsHtml(r.tools)}</div>
      <div class="card"><h3>🔩 Parts</h3>
        ${r.parts.length ? `<label class="model-field"><span>Your model number <span class="muted">(for exact-fit parts)</span></span>
          <input type="text" id="model-number" value="${esc(getModels()[a.id]?.modelNumber || "")}" placeholder="e.g. WED4815EW1" autocomplete="off" /></label>
          <p class="muted" style="margin:4px 0 0">${esc(a.identifyHints[a.identifyHints.length - 1])}</p>` : ""}
        <div id="parts-list">${partsHtml(r.parts, getModels()[a.id] || {})}</div>
      </div>
    </div>
    ${r.parts.length || r.tools.length ? AFFILIATE_NOTE : ""}

    <h2>Steps</h2>
    <div class="progress" aria-hidden="true"><div id="progress-bar"></div></div>
    <p class="muted" id="progress-text"></p>
    <ol class="steps">${r.steps
      .map(
        (s, i) =>
          `<li class="${done.has(i) ? "done" : ""}"><label><input type="checkbox" data-step="${i}" ${done.has(i) ? "checked" : ""} /><span>${esc(s)}</span></label></li>`,
      )
      .join("")}</ol>

    ${r.proSignals.length ? `<h2>Call a pro if…</h2><div class="notice"><ul>${r.proSignals.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>` : ""}
    <div style="margin-top:16px">${proBox({ applianceId: a.id, repairId: r.id })}</div>

    <h2 id="videos">Video tutorials</h2>
    <div class="list">${r.videos.map(videoBlock).join("")}</div>`;

  const updateProgress = () => {
    const pct = Math.round((done.size / r.steps.length) * 100);
    view.querySelector("#progress-bar").style.width = `${pct}%`;
    view.querySelector("#progress-text").textContent =
      done.size === r.steps.length ? "All steps complete — nice work! 🎉" : `${done.size} of ${r.steps.length} steps done`;
  };
  updateProgress();

  const persist = () => {
    putProject({ applianceId: a.id, repairId: r.id, done: [...done], updated: Date.now() });
    view.querySelector("#save-btn").textContent = "✓ Saved to My Projects";
  };

  const modelInput = view.querySelector("#model-number");
  modelInput?.addEventListener("input", () => {
    const info = { ...(getModels()[a.id] || {}), modelNumber: modelInput.value.trim().slice(0, 40) };
    setModel(a.id, info);
    view.querySelector("#parts-list").innerHTML = partsHtml(r.parts, info);
  });

  view.querySelector("#save-btn").addEventListener("click", persist);
  view.querySelector("#share-btn").addEventListener("click", async (e) => {
    const url = location.origin + guideUrl(a.id, r.id);
    try {
      if (navigator.share) await navigator.share({ title: r.title, url });
      else {
        await navigator.clipboard.writeText(url);
        e.target.textContent = "✓ Link copied";
      }
    } catch {
      /* user cancelled or clipboard blocked */
    }
  });
  view.querySelectorAll("[data-step]").forEach((box) =>
    box.addEventListener("change", () => {
      const i = Number(box.dataset.step);
      box.checked ? done.add(i) : done.delete(i);
      box.closest("li").classList.toggle("done", box.checked);
      updateProgress();
      persist();
    }),
  );
}

function saved() {
  const projects = Object.values(getProjects()).sort((x, y) => y.updated - x.updated);
  const items = projects
    .map((p) => {
      const a = findAppliance(p.applianceId);
      const r = findRepair(p.applianceId, p.repairId);
      if (!a || !r) return "";
      const pct = Math.round((p.done.length / r.steps.length) * 100);
      return `<div class="card stack">
        <a href="#/repair/${a.id}/${r.id}" style="text-decoration:none;color:inherit"><h3>${a.icon} ${esc(r.symptom)}</h3><div class="muted">${esc(a.name)} · ${pct === 100 ? "Complete" : `${pct}% done`}</div></a>
        <div class="progress"><div style="width:${pct}%"></div></div>
        <div><button class="btn small secondary" data-remove="${projectKey(a.id, r.id)}">Remove</button></div>
      </div>`;
    })
    .join("");
  const syncNote = user
    ? `<p class="muted">Synced to ${esc(user.email)}.</p>`
    : `<div class="notice">Projects are saved on this device only. <a href="#/account">Create a free account</a> to sync them to your phone and computer.</div>`;
  view.innerHTML = `<h1>My Projects</h1>${syncNote}${items ? `<div class="list" style="margin-top:12px">${items}</div>` : `<p class="muted">No projects yet. Open any repair guide and tap “Start this project” to track your progress here.</p><a class="btn" href="#/browse">Browse repairs</a>`}`;
  view.querySelectorAll("[data-remove]").forEach((btn) =>
    btn.addEventListener("click", () => {
      removeProject(btn.dataset.remove);
      saved();
    }),
  );
}

// ---------- account ----------

// ---------- email verification ----------

const needsVerification = () => Boolean(user && config.verificationRequired && !user.emailVerified);

function verifyBanner() {
  return `<div class="notice warn verify-banner">
    <strong>Confirm your email to start scanning.</strong> We sent a link to ${esc(user.email)}. Can't find it? Check your spam folder.
    <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn small" type="button" data-resend>Send a new link</button><span class="muted" data-resend-msg aria-live="polite"></span></div>
  </div>`;
}

function wireResend(root) {
  root.querySelectorAll("[data-resend]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const note = root.querySelector("[data-resend-msg]");
      btn.disabled = true;
      try {
        const res = await api("/api/email/resend", { method: "POST" });
        if (res.alreadyVerified) {
          await refreshUser();
          return render();
        }
        note.textContent = `Sent! Check ${user.email}.`;
      } catch (err) {
        note.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    }),
  );
}

let verifyToken = "";
const verifyRequests = {};
async function verify() {
  verifyToken = currentRoute().query.get("token") || verifyToken;
  // Keep the token out of the address bar and browser history once it's read.
  history.replaceState(null, "", "#/verify");
  if (!verifyToken) {
    view.innerHTML = `<h1>Confirmation link missing</h1><p>Open the link from your email again, or <a href="#/account">send a new one from your account</a>.</p>`;
    return;
  }
  view.innerHTML = `<h1>Confirming your email…</h1><div class="notice" style="display:flex;gap:12px;align-items:center"><div class="spinner"></div>One moment.</div>`;
  // The page can redraw while this runs; links work once, so send each token only once.
  verifyRequests[verifyToken] ||= api("/api/email/verify", { method: "POST", body: { token: verifyToken } }).then(() => refreshUser());
  try {
    await verifyRequests[verifyToken];
    if (currentRoute().name !== "verify") return;
    view.innerHTML = `<h1>Email confirmed ✓</h1>
      <div class="notice ok">Thanks! ${user ? "You can now scan appliances with your camera." : "Sign in to start scanning appliances with your camera."}</div>
      <p><a class="btn" href="${user ? "#/identify" : "#/account?mode=signin"}">${user ? "Scan an appliance" : "Sign in"}</a></p>`;
  } catch (err) {
    if (currentRoute().name !== "verify") return;
    view.innerHTML = `<h1>That link didn't work</h1><div class="notice warn">${esc(err.message)}</div>
      <p><a class="btn" href="#/account">Go to my account</a></p>`;
  }
}

function account() {
  const { query } = currentRoute();
  if (!user) return authForm(query.get("mode") === "signin" ? "signin" : "signup");

  const { usage } = user;
  const pct = usage.limit ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 100;
  const isPro = user.plan === "pro";
  const checkoutDone = query.get("checkout") === "success";

  view.innerHTML = `
    <h1>Your account</h1>
    ${checkoutDone && !isPro ? `<div class="notice ok" id="checkout-wait" style="display:flex;gap:12px;align-items:center"><div class="spinner"></div>Payment received. Activating Pro…</div>` : ""}
    ${checkoutDone && isPro ? `<div class="notice ok">🎉 Welcome to Pro! Thanks for supporting ${esc(brand().businessName)}.</div>` : ""}
    ${needsVerification() ? verifyBanner() : ""}
    <div class="card stack" style="margin-top:12px">
      <div><strong>${esc(user.email)}</strong></div>
      <div>Plan: <span class="pill ${isPro ? "d1" : ""}">${isPro ? "Pro" : "Free"}</span></div>
      <div>
        <div style="display:flex;justify-content:space-between"><span>Photo scans this month</span><span>${usage.used} / ${usage.limit}</span></div>
        <div class="progress"><div style="width:${pct}%"></div></div>
        <p class="muted" style="margin:6px 0 0">Scans reset on the 1st of each month.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${!isPro && config.billingEnabled ? `<button class="btn" id="upgrade-btn">Upgrade to Pro · ${esc(config.proPriceLabel)}</button>` : ""}
        ${user.hasBilling && config.billingEnabled ? `<button class="btn secondary" id="portal-btn">Manage subscription</button>` : ""}
        ${user.isOwner ? `<a class="btn secondary" href="#/admin">Owner dashboard</a>` : ""}
        <button class="btn secondary" id="logout-btn">Sign out</button>
      </div>
      <div id="account-msg" aria-live="polite"></div>
    </div>
    ${!isPro ? proPitch() : ""}
    ${user.isOwner ? "" : `<details class="card danger-zone" style="margin-top:24px">
      <summary><strong>Delete account</strong></summary>
      <p>This permanently deletes your account, scan history and saved projects. ${isPro ? "<strong>Cancel your Pro membership first</strong> using Manage subscription above." : ""} It can't be undone. Any service requests you sent stay with ${esc(brand().businessName)} as business records. <a href="/privacy">Privacy Policy</a></p>
      <form id="delete-form" class="stack" style="max-width:360px">
        <label class="stack" style="gap:4px"><strong>Enter your password to confirm</strong><input type="password" name="password" autocomplete="current-password" required /></label>
        <div><button class="btn danger" type="submit">Delete my account</button></div>
        <div id="delete-msg" aria-live="polite"></div>
      </form>
    </details>`}
    <p class="muted small-print" style="margin-top:16px"><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a></p>`;

  wireResend(view);
  view.querySelector("#delete-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!confirm("Delete your account permanently? This can't be undone.")) return;
    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      await api("/api/account", { method: "DELETE", body: { password: form.password.value } });
      user = null;
      saveProjects({});
      updateAccountNav();
      view.innerHTML = `<h1>Your account was deleted</h1><div class="notice ok">Your account, scan history and saved projects have been removed.</div><p><a class="btn secondary" href="#/">Back to home</a></p>`;
    } catch (err) {
      form.querySelector("#delete-msg").innerHTML = `<div class="notice warn">${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });

  const msg = view.querySelector("#account-msg");
  const redirect = (path) => async (e) => {
    e.target.disabled = true;
    try {
      location.href = (await api(path, { method: "POST" })).url;
    } catch (err) {
      msg.innerHTML = `<div class="notice warn">${esc(err.message)}</div>`;
      e.target.disabled = false;
    }
  };
  view.querySelector("#upgrade-btn")?.addEventListener("click", redirect("/api/billing/checkout"));
  view.querySelector("#portal-btn")?.addEventListener("click", redirect("/api/billing/portal"));
  view.querySelector("#logout-btn").addEventListener("click", async () => {
    await api("/api/logout", { method: "POST" }).catch(() => {});
    user = null;
    updateAccountNav();
    location.hash = "#/";
  });

  // Stripe's webhook can land a few seconds after the redirect back, so poll briefly.
  if (checkoutDone && !isPro) {
    let tries = 0;
    const poll = async () => {
      if (currentRoute().name !== "account") return;
      await refreshUser();
      if (user?.plan === "pro") return account();
      if (++tries < 10) setTimeout(poll, 2000);
      else view.querySelector("#checkout-wait").innerHTML = "Payment received. Pro will activate shortly. Refresh this page in a minute.";
    };
    setTimeout(poll, 1500);
  }
}

function proPitch() {
  return `<div class="card pro-card" style="margin-top:16px">
    <h3>⭐ ${esc(brand().businessName)} Pro</h3>
    <ul>
      <li><strong>${esc(config.proScansPerMonth)} photo scans a month</strong> instead of ${esc(config.freeScansPerMonth)}</li>
      <li>Scan every appliance in the house, not just the one that broke</li>
      <li>Every scan reads the brand and model so parts links fit</li>
      <li>Cancel anytime</li>
    </ul>
    ${config.billingEnabled ? "" : `<p class="muted" style="margin:0">Pro upgrades are coming soon.</p>`}
  </div>`;
}

function forgot() {
  view.innerHTML = `
    <h1>Reset your password</h1>
    <p class="muted">Enter the email you signed up with and we'll send you a link to choose a new password.</p>
    <form class="card stack" id="forgot-form" style="max-width:420px">
      <label class="stack" style="gap:4px"><strong>Email</strong><input type="text" inputmode="email" name="email" autocomplete="email" required /></label>
      <button class="btn" type="submit">Send reset link</button>
      <div id="forgot-msg" aria-live="polite"></div>
      <p class="muted" style="margin:0"><a href="#/account?mode=signin">Back to sign in</a></p>
    </form>`;
  const form = view.querySelector("#forgot-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button");
    btn.disabled = true;
    const msg = form.querySelector("#forgot-msg");
    try {
      const data = await api("/api/password/forgot", { method: "POST", body: { email: form.email.value } });
      msg.innerHTML = `<div class="notice ok">${esc(data.message)} The link works for one hour.</div>`;
      btn.textContent = "Send again";
    } catch (err) {
      msg.innerHTML = `<div class="notice warn">${esc(err.message)}</div>`;
    } finally {
      btn.disabled = false;
    }
  });
}

let resetToken = "";
function reset() {
  resetToken = currentRoute().query.get("token") || resetToken;
  const token = resetToken;
  // Keep the token out of the address bar and browser history once it's read.
  history.replaceState(null, "", "#/reset");
  if (!token) {
    view.innerHTML = `<h1>Reset link missing</h1><p>Open the link from your email again, or <a href="#/forgot">request a new one</a>.</p>`;
    return;
  }
  view.innerHTML = `
    <h1>Choose a new password</h1>
    <form class="card stack" id="reset-form" style="max-width:420px">
      <label class="stack" style="gap:4px"><strong>New password</strong><input type="password" name="password" autocomplete="new-password" minlength="8" required /><span class="muted">At least 8 characters.</span></label>
      <label class="stack" style="gap:4px"><strong>Confirm new password</strong><input type="password" name="confirm" autocomplete="new-password" minlength="8" required /></label>
      <button class="btn" type="submit">Save new password</button>
      <div id="reset-msg" aria-live="polite"></div>
    </form>`;
  const form = view.querySelector("#reset-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = form.querySelector("#reset-msg");
    if (form.password.value !== form.confirm.value) {
      msg.innerHTML = `<div class="notice warn">The passwords don't match.</div>`;
      return;
    }
    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      user = (await api("/api/password/reset", { method: "POST", body: { token, password: form.password.value } })).user;
      updateAccountNav();
      await syncProjects();
      view.innerHTML = `<h1>Password updated</h1><div class="notice ok">You're signed in. For your security, other devices have been signed out.</div><p><a class="btn" href="#/account">Go to my account</a></p>`;
    } catch (err) {
      msg.innerHTML = `<div class="notice warn">${esc(err.message)}${err.code === "bad_token" ? ` <a href="#/forgot">Request a new link</a>.` : ""}</div>`;
      btn.disabled = false;
    }
  });
}

function authForm(mode) {
  const signup = mode === "signup";
  view.innerHTML = `
    <h1>${signup ? "Create your free account" : "Welcome back"}</h1>
    <p class="muted">${signup ? `Get ${esc(config.freeScansPerMonth)} free photo scans every month and sync your projects across devices.` : "Sign in to scan appliances and sync your projects."}</p>
    <form class="card stack" id="auth-form" style="max-width:420px">
      <label class="stack" style="gap:4px"><strong>Email</strong><input type="text" inputmode="email" name="email" autocomplete="email" required /></label>
      <label class="stack" style="gap:4px"><strong>Password</strong><input type="password" name="password" autocomplete="${signup ? "new-password" : "current-password"}" minlength="8" required />${signup ? `<span class="muted">At least 8 characters.</span>` : ""}</label>
      <button class="btn" type="submit">${signup ? "Create account" : "Sign in"}</button>
      ${!signup && config.passwordResetEnabled ? `<a href="#/forgot" style="justify-self:start">Forgot your password?</a>` : ""}
      <div id="auth-msg" aria-live="polite"></div>
      <p class="muted" style="margin:0">${signup ? `Already have an account? <a href="#/account?mode=signin">Sign in</a>` : `New here? <a href="#/account">Create a free account</a>`}</p>
      ${signup ? `<p class="muted small-print" style="margin:0">By creating an account, you agree to our <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a>.${config.verificationRequired ? " We'll email you a link to confirm your address." : ""}</p>` : ""}
    </form>`;

  const form = view.querySelector("#auth-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      const data = await api(signup ? "/api/signup" : "/api/login", {
        method: "POST",
        body: { email: form.email.value, password: form.password.value },
      });
      user = data.user;
      updateAccountNav();
      await syncProjects();
      go(takeAfterLogin() || "#/account");
    } catch (err) {
      form.querySelector("#auth-msg").innerHTML = `<div class="notice warn">${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}

// ---------- request service (leads for the business) ----------

function book() {
  const b = brand();
  const { query } = currentRoute();
  const a = findAppliance(query.get("appliance") || "");
  const r = a ? findRepair(a.id, query.get("repair") || "") : null;
  if (!b.bookingEnabled) {
    view.innerHTML = `<h1>Get a pro</h1>${b.phone ? `<p>Call ${esc(b.businessName)} to book a repair.</p><a class="btn" href="${telHref(b.phone)}">📞 Call ${esc(b.phone)}</a>` : `<p class="muted">Online booking isn't available right now.</p>`}`;
    return;
  }
  view.innerHTML = `
    <h1>Request service from ${esc(b.businessName)}</h1>
    <p class="lead">${b.serviceArea ? `We serve ${esc(b.serviceArea)}. ` : ""}Tell us what's wrong and we'll get back to you to schedule a visit.</p>
    ${b.phone ? `<p>In a hurry? <a href="${telHref(b.phone)}"><strong>📞 Call ${esc(b.phone)}</strong></a></p>` : ""}
    <form class="card stack" id="book-form" style="max-width:560px" novalidate>
      <div class="two-col" style="gap:12px">
        <label class="stack" style="gap:4px"><strong>Your name</strong><input type="text" name="name" autocomplete="name" required maxlength="80" /></label>
        <label class="stack" style="gap:4px"><strong>Phone</strong><input type="text" name="phone" inputmode="tel" autocomplete="tel" required maxlength="30" /></label>
        <label class="stack" style="gap:4px"><strong>Email</strong> <input type="text" name="email" inputmode="email" autocomplete="email" maxlength="254" placeholder="Optional" /></label>
        <label class="stack" style="gap:4px"><strong>ZIP code</strong><input type="text" name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="12" /></label>
      </div>
      <label class="stack" style="gap:4px"><strong>Appliance</strong>
        <select name="applianceId"><option value="">Something else</option>${CATALOG.map((x) => `<option value="${x.id}" ${x === a ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>
      </label>
      <label class="stack" style="gap:4px"><strong>What's going on?</strong>
        <textarea name="message" maxlength="2000" placeholder="e.g. Dryer runs but doesn't heat. Started last week.">${r ? esc(`${r.symptom}. `) : ""}</textarea>
      </label>
      <label class="stack" style="gap:4px"><strong>Best time to reach you</strong>
        <select name="preferredTime"><option>Any time</option><option>Morning</option><option>Afternoon</option><option>Evening</option></select>
      </label>
      <label class="hp" aria-hidden="true">Website <input type="text" name="website" tabindex="-1" autocomplete="off" /></label>
      <label style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" name="consent" required style="margin-top:5px" />
        <span>${esc(b.businessName)} may contact me about this request by phone, text or email. See our <a href="/privacy" target="_blank">Privacy Policy</a>.</span></label>
      <button class="btn" type="submit">Send request</button>
      <div id="book-msg" aria-live="polite"></div>
    </form>`;

  const form = view.querySelector("#book-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    const data = Object.fromEntries(new FormData(form));
    try {
      await api("/api/leads", {
        method: "POST",
        body: { ...data, consent: form.consent.checked, repairId: r?.id || "", source: r ? `guide:${a.id}/${r.id}` : a ? `appliance:${a.id}` : "app" },
      });
      view.innerHTML = `<h1>Request sent ✓</h1>
        <div class="notice ok">Thanks, ${esc(data.name)}! ${esc(b.businessName)} will contact you soon at ${esc(data.phone)}.</div>
        ${b.phone ? `<p>Need us sooner? <a href="${telHref(b.phone)}">📞 Call ${esc(b.phone)}</a></p>` : ""}
        <p><a class="btn secondary" href="#/">Back to home</a></p>`;
    } catch (err) {
      form.querySelector("#book-msg").innerHTML = `<div class="notice warn">${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}

// ---------- first-time owner setup ----------

function setup() {
  if (!config.setupNeeded) {
    view.innerHTML = `<h1>Already set up</h1><p>This site already has an owner. <a href="#/account?mode=signin">Sign in</a> to open the dashboard.</p>`;
    return;
  }
  view.innerHTML = `
    <h1>Set up your business site</h1>
    <p class="lead">Create the owner account. Only the owner can see job requests and change the business settings.</p>
    <form class="card stack" id="setup-form" style="max-width:440px">
      <label class="stack" style="gap:4px"><strong>Setup code</strong><input type="text" name="code" autocomplete="off" required />
        <span class="muted">Your SETUP_CODE setting, or the code printed in the server log when it started.</span></label>
      <label class="stack" style="gap:4px"><strong>Your email</strong><input type="text" inputmode="email" name="email" autocomplete="email" required /></label>
      <label class="stack" style="gap:4px"><strong>Password</strong><input type="password" name="password" autocomplete="new-password" minlength="8" required /><span class="muted">At least 8 characters.</span></label>
      <button class="btn" type="submit">Create owner account</button>
      <div id="setup-msg" aria-live="polite"></div>
    </form>`;
  const form = view.querySelector("#setup-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      await api("/api/setup", { method: "POST", body: { code: form.code.value.trim(), email: form.email.value, password: form.password.value } });
      config.setupNeeded = false;
      await refreshUser();
      await syncProjects();
      go("#/admin?tab=settings&welcome=1");
    } catch (err) {
      form.querySelector("#setup-msg").innerHTML = `<div class="notice warn">${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}

// ---------- owner dashboard ----------

const STATUS_LABEL = { new: "New", contacted: "Contacted", scheduled: "Scheduled", won: "Job done", lost: "Lost" };
const STATUS_TONE = { new: "orange", contacted: "blue", scheduled: "violet", won: "green", lost: "red" };

async function admin() {
  if (!userLoaded) {
    view.innerHTML = `<h1>Owner dashboard</h1><div class="notice" style="display:flex;gap:12px;align-items:center"><div class="spinner"></div>Loading…</div>`;
    return;
  }
  if (!user) {
    rememberAfterLogin("#/admin");
    return go("#/account?mode=signin");
  }
  if (!user.isOwner) {
    view.innerHTML = `<h1>Owner dashboard</h1><p>Only the business owner can open this page.</p>`;
    return;
  }
  const { query } = currentRoute();
  const tab = ["jobs", "settings", "setup"].includes(query.get("tab")) ? query.get("tab") : "jobs";
  view.innerHTML = `<h1>Owner dashboard</h1><div class="notice" style="display:flex;gap:12px;align-items:center"><div class="spinner"></div>Loading…</div>`;

  let overview;
  try {
    overview = await api("/api/admin/overview");
  } catch (err) {
    view.innerHTML = `<h1>Owner dashboard</h1><div class="notice warn">${esc(err.message)}</div>`;
    return;
  }
  if (currentRoute().name !== "admin") return;
  const { stats, checklist } = overview;
  const todo = checklist.filter((c) => !c.done && !c.optional).length;
  const newLeads = stats.leadsByStatus.new || 0;

  view.innerHTML = `
    <h1>Owner dashboard</h1>
    ${query.get("welcome") ? `<div class="notice ok">🎉 You're the owner now. Start by filling in your business details below.</div>` : ""}
    <div class="stat-row">
      <div class="stat tone-orange"><strong>${newLeads}</strong><span>new requests</span></div>
      <div class="stat tone-blue"><strong>${stats.leadsThisMonth}</strong><span>requests this month</span></div>
      <div class="stat tone-green"><strong>${stats.users}</strong><span>members</span></div>
      <div class="stat tone-violet"><strong>${stats.proSubscribers}</strong><span>Pro subscribers</span></div>
      <div class="stat tone-teal"><strong>${stats.scansThisMonth}</strong><span>photo scans this month (≈$${stats.estimatedAiCostThisMonth.toFixed(2)})</span></div>
    </div>
    <div class="tabs" role="tablist">
      <a role="tab" href="#/admin?tab=jobs" aria-selected="${tab === "jobs"}">Job requests${newLeads ? ` <span class="badge">${newLeads}</span>` : ""}</a>
      <a role="tab" href="#/admin?tab=settings" aria-selected="${tab === "settings"}">Business settings</a>
      <a role="tab" href="#/admin?tab=setup" aria-selected="${tab === "setup"}">Setup checklist${todo ? ` <span class="badge">${todo}</span>` : ""}</a>
    </div>
    <div id="admin-tab"></div>`;
  const panel = view.querySelector("#admin-tab");
  if (tab === "jobs") adminJobs(panel, query.get("status") || "");
  if (tab === "settings") adminSettings(panel);
  if (tab === "setup") adminSetup(panel, checklist);
}

async function adminJobs(panel, status) {
  const { leads, statuses } = await api(`/api/admin/leads${status ? `?status=${status}` : ""}`);
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0">
      <div class="chips">${["", ...statuses]
        .map((s) => `<a class="chip" aria-pressed="${s === status}" href="#/admin?tab=jobs${s ? `&status=${s}` : ""}">${s ? STATUS_LABEL[s] : "All"}</a>`)
        .join("")}</div>
      <a class="btn small secondary" href="/api/admin/leads.csv" download>⬇ Download spreadsheet</a>
    </div>
    ${leads.length ? `<div class="list">${leads.map(leadCard).join("")}</div>` : `<div class="notice">No ${status ? STATUS_LABEL[status].toLowerCase() + " " : ""}requests yet. When customers tap “Request service” on a guide, they'll show up here${brand().leadEmail || brand().contactEmail ? " and in your email" : ""}.</div>`}`;

  panel.querySelectorAll("[data-lead]").forEach((card) => {
    const id = card.dataset.lead;
    const save = async (body, note) => {
      try {
        await api(`/api/admin/leads/${id}`, { method: "PATCH", body });
        note.textContent = "Saved ✓";
      } catch (err) {
        note.textContent = err.message;
      }
    };
    const note = card.querySelector(".save-note");
    card.querySelector("select").addEventListener("change", (e) => {
      card.querySelector(".lead-status").className = `pill lead-status tone-${STATUS_TONE[e.target.value]}`;
      card.querySelector(".lead-status").textContent = STATUS_LABEL[e.target.value];
      save({ status: e.target.value }, note);
    });
    card.querySelector("[data-save-notes]").addEventListener("click", () => save({ notes: card.querySelector("textarea").value }, note));
    card.querySelector("[data-delete-lead]").addEventListener("click", async () => {
      if (!confirm("Delete this request permanently? Use this for spam, or when a customer asks you to delete their information.")) return;
      try {
        await api(`/api/admin/leads/${id}`, { method: "DELETE" });
        card.remove();
      } catch (err) {
        note.textContent = err.message;
      }
    });
  });
}

function leadCard(l) {
  const when = new Date(l.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return `<article class="card stack lead" data-lead="${l.id}">
    <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
      <div><h3 style="margin:0">${esc(l.name)} <span class="pill lead-status tone-${STATUS_TONE[l.status]}">${STATUS_LABEL[l.status]}</span></h3>
        <div class="muted">${esc(when)}${l.zip ? ` · ZIP ${esc(l.zip)}` : ""}${l.preferred_time ? ` · Best time: ${esc(l.preferred_time)}` : ""}</div></div>
      <div class="shop-links">
        <a class="btn small" href="${telHref(l.phone)}">📞 ${esc(l.phone)}</a>
        ${l.email ? `<a class="btn small secondary" href="mailto:${esc(l.email)}">✉ Email</a>` : ""}
      </div>
    </div>
    ${l.applianceName ? `<div><strong>${esc(l.applianceName)}</strong>${l.repairTitle ? ` · was reading “${esc(l.repairTitle)}”` : ""}</div>` : ""}
    ${l.message ? `<p style="margin:0;white-space:pre-wrap">${esc(l.message)}</p>` : ""}
    <div class="two-col" style="gap:12px;align-items:end">
      <label class="stack" style="gap:4px"><span class="muted">Status</span>
        <select>${Object.entries(STATUS_LABEL).map(([v, t]) => `<option value="${v}" ${v === l.status ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <div class="stack" style="gap:4px"><span class="muted">Private notes</span><textarea rows="2" maxlength="2000" placeholder="e.g. Booked for Tue 10am, needs thermal fuse">${esc(l.notes)}</textarea>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn small secondary" data-save-notes type="button">Save notes</button><button class="btn small secondary" data-delete-lead type="button">Delete</button><span class="muted save-note" aria-live="polite"></span></div></div>
    </div>
  </article>`;
}

async function adminSettings(panel) {
  const { settings: s } = await api("/api/admin/settings");
  const field = (name, label, hint = "", attrs = "") =>
    `<label class="stack" style="gap:4px"><strong>${label}</strong><input type="text" name="${name}" value="${esc(s[name])}" ${attrs} />${hint ? `<span class="muted">${hint}</span>` : ""}</label>`;
  panel.innerHTML = `
    <form class="card stack" id="settings-form" style="margin-top:12px">
      <h3 style="margin:0">Your business</h3>
      <div class="two-col" style="gap:12px">
        ${field("businessName", "Business name", "Shown at the top of every page and in search results.", 'maxlength="60" required')}
        ${field("tagline", "Tagline", "A short line on the home page.", 'maxlength="80"')}
        ${field("phone", "Phone", "Customers can tap to call you.", 'maxlength="30" inputmode="tel"')}
        ${field("contactEmail", "Public email", "Shown in the footer. Optional.", 'maxlength="254" inputmode="email"')}
        ${field("serviceArea", "Service area", "e.g. Austin, Round Rock and Cedar Park", 'maxlength="120"')}
        ${field("services", "What you fix", "e.g. Appliance repair, water heaters and HVAC", 'maxlength="160"')}
      </div>
      <h3 style="margin:8px 0 0">Look</h3>
      <div class="two-col" style="gap:12px">
        <label class="stack" style="gap:4px"><strong>Brand color</strong>
          <span style="display:flex;gap:8px;align-items:center"><input type="color" name="brandColor" value="${esc(s.brandColor)}" style="width:56px;height:44px;padding:2px;border-radius:10px" /><span class="muted">Text and buttons are adjusted automatically so they stay readable.</span></span></label>
        ${field("logoEmoji", "Logo", "An emoji like 🔧 🛠️ ⚡ 🏠 shown next to your name.", 'maxlength="8"')}
      </div>
      <h3 style="margin:8px 0 0">Job requests</h3>
      <label style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" name="bookingEnabled" ${s.bookingEnabled ? "checked" : ""} style="margin-top:5px" />
        <span><strong>Let customers request service online</strong><br><span class="muted">Adds “Request service” buttons to guides and scan results. Turn off to show only your phone number.</span></span></label>
      ${field("leadEmail", "Email new requests to", "Leave blank to use your public email, or your owner login email.", 'maxlength="254" inputmode="email"')}
      <h3 style="margin:8px 0 0">Legal pages</h3>
      <p class="muted" style="margin:0">Your <a href="/privacy" target="_blank">Privacy Policy</a> and <a href="/terms" target="_blank">Terms of Service</a> are filled in from these settings. Have a lawyer review them before you launch.</p>
      ${field("governingState", "State whose laws apply", "e.g. Texas. Leave blank to leave this out of the Terms.", 'maxlength="40"')}
      <div><button class="btn" type="submit">Save settings</button></div>
      <div id="settings-msg" aria-live="polite"></div>
    </form>`;
  const form = panel.querySelector("#settings-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button");
    btn.disabled = true;
    const body = Object.fromEntries(new FormData(form));
    body.bookingEnabled = form.bookingEnabled.checked;
    try {
      await api("/api/admin/settings", { method: "PUT", body });
      // Reload so the new name and colors apply everywhere.
      location.hash = "#/admin?tab=settings&saved=1";
      location.reload();
    } catch (err) {
      form.querySelector("#settings-msg").innerHTML = `<div class="notice warn">${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });
  if (currentRoute().query.get("saved")) form.querySelector("#settings-msg").innerHTML = `<div class="notice ok">Saved ✓ Your site now shows the new details.</div>`;
}

function adminSetup(panel, checklist) {
  panel.innerHTML = `
    <p class="muted" style="margin-top:12px">Each item turns on a feature. Settings in CAPITALS go in your hosting provider's environment settings (see the Owner's Guide), then restart the app.</p>
    <div class="list">${checklist
      .map(
        (c) => `<div class="card checklist-item ${c.done ? "done" : ""}">
          <span class="check" aria-hidden="true">${c.done ? "✓" : ""}</span>
          <div><h3 style="margin:0">${esc(c.label)}${c.optional ? ` <span class="pill">Optional</span>` : ""}</h3>
          <p class="muted" style="margin:4px 0 0">${c.done ? "Connected." : esc(c.help)}</p></div>
        </div>`,
      )
      .join("")}</div>
    <div class="card stack" style="margin-top:16px">
      <h3 style="margin:0">💾 Backups</h3>
      <p class="muted" style="margin:0">Download a copy of everything: members, job requests and settings. Keep it somewhere safe, like cloud storage. Do this monthly, and before any big change.</p>
      <div><a class="btn small secondary" href="/api/admin/backup" download>Download backup</a></div>
    </div>`;
}

function notFound() {
  view.innerHTML = `<h1>Not found</h1><p>That guide doesn't exist. <a href="#/browse">Browse all repairs</a>.</p>`;
}

// ---------- identify ----------

function identify() {
  view.innerHTML = `
    <h1>Identify your appliance</h1>
    <p class="muted">Take a clear photo of the whole appliance, or of its model/serial label for the best match.</p>
    ${config.aiEnabled ? (!user ? scanSignupHtml() : needsVerification() ? verifyBanner() : photoIdentifierHtml()) : `<div class="notice">Photo identification isn't enabled on this server yet. Use the guided identifier below.</div>`}
    <h2>${config.aiEnabled ? "Or answer a quick question" : "Guided identifier"}</h2>
    <p>Where is it in your home?</p>
    <div class="chips" id="rooms">${[...new Set(CATALOG.map((a) => a.category))]
      .map((c) => `<button class="chip" type="button" aria-pressed="false" data-room="${esc(c)}">${esc(c)}</button>`)
      .join("")}</div>
    <div id="room-results" class="stack" style="margin-top:16px"></div>`;

  view.querySelectorAll("[data-room]").forEach((chip) =>
    chip.addEventListener("click", () => {
      view.querySelectorAll("[data-room]").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      view.querySelector("#room-results").innerHTML = CATALOG.filter((a) => a.category === chip.dataset.room)
        .map(
          (a) =>
            `<a class="card" href="#/appliance/${a.id}"><h3>${a.icon} ${esc(a.name)}</h3><ul class="muted" style="margin:0;padding-left:20px">${a.identifyHints.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></a>`,
        )
        .join("");
    }),
  );

  view.querySelectorAll("[data-after-login]").forEach((el) =>
    el.addEventListener("click", () => rememberAfterLogin("#/identify")),
  );
  wireResend(view);
  if (config.aiEnabled && user && !needsVerification()) wirePhotoIdentifier();
}

function scanSignupHtml() {
  return `<div class="card stack pro-card">
    <div style="font-size:2.5rem">📷</div>
    <h3>Scan your appliance with a photo</h3>
    <p style="margin:0">Create a free account to get ${esc(config.freeScansPerMonth)} photo scans a month. We'll identify the appliance, read the model number, and match repairs and exact-fit parts.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <a class="btn" data-after-login href="#/account">Create free account</a>
      <a class="btn secondary" data-after-login href="#/account?mode=signin">Sign in</a>
    </div>
  </div>`;
}

function usageLine() {
  const { limit, remaining } = user.usage;
  return `<p class="muted" id="usage-line" style="margin:0">${remaining} of ${limit} scans left this month${user.plan === "pro" ? " · Pro" : ` · <a href="#/account">Upgrade for more</a>`}</p>`;
}

function photoIdentifierHtml() {
  return `
    <div class="stack">
      ${usageLine()}
      <label class="dropzone" id="dropzone">
        <input type="file" id="photo" accept="image/*" capture="environment" class="sr-only" />
        <div id="preview"><div style="font-size:2.5rem">📷</div><strong>Tap to take or upload a photo</strong><div class="muted">or drag an image here</div></div>
      </label>
      <label for="problem"><strong>What's the problem?</strong> <span class="muted">(optional)</span></label>
      <textarea id="problem" placeholder="e.g. It hums but won't spin, and there's water left in the drum"></textarea>
      <div><button class="btn" id="identify-btn" disabled>Identify &amp; suggest repairs</button></div>
      <div id="identify-result" aria-live="polite"></div>
    </div>`;
}

// Downscale the photo in the browser so uploads are fast and under the API limit.
async function prepareImage(file) {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1568;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { dataUrl, image: dataUrl.split(",")[1], mediaType: "image/jpeg" };
}

function wirePhotoIdentifier() {
  const input = view.querySelector("#photo");
  const zone = view.querySelector("#dropzone");
  const btn = view.querySelector("#identify-btn");
  const out = view.querySelector("#identify-result");
  let prepared = null;

  const accept = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      prepared = await prepareImage(file);
      view.querySelector("#preview").innerHTML = `<img src="${prepared.dataUrl}" alt="Your appliance photo" /><div class="muted">Tap to change photo</div>`;
      btn.disabled = false;
    } catch {
      out.innerHTML = `<div class="notice warn">Couldn't read that image. Try a JPEG or PNG photo.</div>`;
    }
  };

  input.addEventListener("change", () => accept(input.files[0]));
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("drag");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("drag");
    accept(e.dataTransfer.files[0]);
  });

  btn.addEventListener("click", async () => {
    if (!prepared) return;
    btn.disabled = true;
    out.innerHTML = `<div class="notice" style="display:flex;gap:12px;align-items:center"><div class="spinner"></div>Looking at your photo…</div>`;
    try {
      const body = await api("/api/identify", {
        method: "POST",
        body: { image: prepared.image, mediaType: prepared.mediaType, problem: view.querySelector("#problem").value },
      });
      if (body.usage) {
        user.usage = body.usage;
        view.querySelector("#usage-line").outerHTML = usageLine();
      }
      if (body.is_appliance && findAppliance(body.catalog_id) && (body.model_number || body.brand)) {
        setModel(body.catalog_id, { brand: body.brand, modelNumber: body.model_number });
      }
      out.innerHTML = identificationHtml(body);
    } catch (err) {
      if (err.code === "upgrade_required") {
        out.innerHTML = `<div class="notice warn">${esc(err.message)}</div>${proPitch()}${config.billingEnabled ? `<p><a class="btn" href="#/account">Upgrade to Pro · ${esc(config.proPriceLabel)}</a></p>` : ""}`;
      } else if (err.code === "verify_email") {
        user.emailVerified = false;
        render();
      } else if (err.code === "auth_required") {
        user = null;
        updateAccountNav();
        render();
      } else {
        out.innerHTML = `<div class="notice warn">${esc(err.message)}</div>`;
      }
    } finally {
      btn.disabled = false;
    }
  });
}

function identificationHtml(result) {
  if (!result.is_appliance) {
    return `<div class="notice warn"><strong>We couldn't spot an appliance in that photo.</strong><ul>${result.observations.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>Try a well-lit photo showing the whole unit or its label.</div>`;
  }
  const a = findAppliance(result.catalog_id);
  const matched = a ? result.suggested_repair_ids.map((id) => findRepair(a.id, id)).filter(Boolean) : [];
  const others = a ? a.repairs.filter((r) => !matched.includes(r)) : [];
  const partCtx = { brand: result.brand, modelNumber: result.model_number };
  const details = [result.brand && `Brand: ${result.brand}`, result.model_number && `Model: ${result.model_number}`]
    .filter(Boolean)
    .map(esc)
    .join(" · ");

  return `<div class="stack">
    <div class="card notice ok">
      <h3>${a ? a.icon : "🔎"} ${esc(result.appliance_name)} <span class="pill">${esc(result.confidence)} confidence</span></h3>
      ${details ? `<div>${details}</div>` : ""}
      <ul class="muted">${result.observations.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
      ${result.label_tip ? `<div><strong>Model label:</strong> ${esc(result.label_tip)}</div>` : ""}
    </div>
    ${result.safety_notes.length ? `<div class="notice warn"><strong>Safety</strong><ul>${result.safety_notes.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>` : ""}
    ${matched.length ? `<h2>Suggested repairs</h2><div class="list">${matched.map((r) => repairCard(a, r)).join("")}</div>` : ""}
    ${result.extra_suggestions.length ? `<h2>${matched.length ? "Other ideas" : "Repair ideas"}</h2><div class="list">${result.extra_suggestions
      .map(
        (s) => `<div class="card stack">
          <div><h3>${esc(s.symptom)}</h3><div class="muted">Likely cause: ${esc(s.likely_cause)}</div>
          <div class="meta"><span class="pill">${esc(s.difficulty)}</span>${s.call_a_pro ? `<span class="pill d3">Call a pro</span>` : ""}</div></div>
          <p style="margin:0">${esc(s.fix_summary)}</p>
          ${s.parts?.length ? `<div><strong>Parts</strong>${partsHtml(s.parts, partCtx)}</div>` : ""}
          ${videoBlock({ title: `Tutorials: ${s.symptom}`, query: s.video_search_query })}
        </div>`,
      )
      .join("")}</div>${result.extra_suggestions.some((s) => s.parts?.length) ? AFFILIATE_NOTE : ""}` : ""}
    ${matched.length && (partCtx.modelNumber || partCtx.brand) ? `<p class="muted">We saved your ${esc(`${partCtx.brand} ${partCtx.modelNumber}`.trim())} so repair guides link to parts that fit.</p>` : ""}
    ${proBox({
      applianceId: a?.id || "",
      heading: result.extra_suggestions.some((s) => s.call_a_pro) ? "This one may need a pro" : "Rather have a pro fix it?",
    })}
    ${others.length ? `<h2>More ${esc(a.name.toLowerCase())} guides</h2><div class="list">${others.map((r) => repairCard(a, r)).join("")}</div>` : ""}
  </div>`;
}

// Show general safety basics once per browser.
if (!storage.get("fixit.safetySeen", false)) {
  const banner = document.createElement("div");
  banner.className = "notice warn";
  banner.style.cssText = "max-width:960px;margin:16px auto 0;";
  banner.innerHTML = `<strong>DIY safety basics</strong><ul>${SAFETY_BASICS.map((s) => `<li>${esc(s)}</li>`).join("")}</ul><button class="btn small">Got it</button>`;
  banner.querySelector("button").addEventListener("click", () => {
    storage.set("fixit.safetySeen", true);
    banner.remove();
  });
  document.querySelector(".topbar").after(banner);
}

refreshUser().then(() => {
  syncProjects();
  if (["identify", "account", "saved", "admin"].includes(currentRoute().name)) render();
});
api("/api/config")
  .then((c) => {
    config = { ...config, ...c };
    applyBrand();
    render();
  })
  .catch(() => {});

render();
