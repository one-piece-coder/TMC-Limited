import {
  CATALOG,
  SAFETY_BASICS,
  findAppliance,
  findRepair,
  searchCatalog,
  youtubeEmbedUrl,
  youtubeSearchUrl,
} from "./data/catalog.js";
import { FALLBACK_RETAILERS, cleanItemName, partQuery, shopLinks } from "./data/parts.js";

const view = document.getElementById("view");
const DIFFICULTY = { 1: "Easy", 2: "Moderate", 3: "Advanced" };
const HAZARD_TEXT = {
  electrical: "Electrical — unplug or switch off the breaker first.",
  gas: "Gas — shut the gas valve. If you smell gas, leave and call your utility.",
  water: "Water — shut off the supply valve and keep towels handy.",
  fire: "Fire — clogged dryer vents are a fire risk; clean them yearly.",
  scald: "Scalding — water heater contents can be extremely hot.",
  burn: "Burns — let surfaces cool completely before touching.",
  cutting: "Blades — never put your hand inside a disposal.",
};

let config = { aiEnabled: false, billingEnabled: false, freeScansPerMonth: 3, retailers: FALLBACK_RETAILERS };
let user = null;

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
  updateAccountNav();
  return user;
}

function updateAccountNav() {
  const link = document.querySelector('[data-nav="account"]');
  if (link) link.textContent = user ? (user.plan === "pro" ? "Account · Pro" : "Account") : "Sign in";
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
  const views = { home, identify, browse, appliance, repair, saved, search, account, forgot, reset };
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
      <p class="eyebrow">DIY home repair, made simple</p>
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
    <ul>${a.identifyHints.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>`;
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
    ${checkoutDone && isPro ? `<div class="notice ok">🎉 Welcome to Pro! Thanks for supporting FixIt Home.</div>` : ""}
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
        <button class="btn secondary" id="logout-btn">Sign out</button>
      </div>
      <div id="account-msg" aria-live="polite"></div>
    </div>
    ${!isPro ? proPitch() : ""}`;

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
    <h3>⭐ FixIt Pro</h3>
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

function notFound() {
  view.innerHTML = `<h1>Not found</h1><p>That guide doesn't exist. <a href="#/browse">Browse all repairs</a>.</p>`;
}

// ---------- identify ----------

function identify() {
  view.innerHTML = `
    <h1>Identify your appliance</h1>
    <p class="muted">Take a clear photo of the whole appliance, or of its model/serial label for the best match.</p>
    ${config.aiEnabled ? (user ? photoIdentifierHtml() : scanSignupHtml()) : `<div class="notice">Photo identification isn't enabled on this server yet. Use the guided identifier below.</div>`}
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
  if (config.aiEnabled && user) wirePhotoIdentifier();
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
  if (["identify", "account", "saved"].includes(currentRoute().name)) render();
});
api("/api/config")
  .then((c) => {
    config = { ...config, ...c };
    render();
  })
  .catch(() => {});

render();
