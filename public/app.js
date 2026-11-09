import {
  CATALOG,
  SAFETY_BASICS,
  findAppliance,
  findRepair,
  searchCatalog,
  youtubeEmbedUrl,
  youtubeSearchUrl,
} from "./data/catalog.js";

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

let config = { aiEnabled: false };
fetch("/api/config")
  .then((r) => (r.ok ? r.json() : config))
  .then((c) => {
    config = c;
    if (currentRoute().name === "identify") render();
  })
  .catch(() => {});

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

const getProjects = () => storage.get("fixit.projects", {});
const saveProjects = (p) => storage.set("fixit.projects", p);
const projectKey = (a, r) => `${a}/${r}`;

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
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { name: parts[0] || "home", params: parts.slice(1).map(decodeURIComponent) };
}

function render() {
  const { name, params } = currentRoute();
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const active = a.dataset.nav === name || (a.dataset.nav === "browse" && ["appliance", "repair"].includes(name));
    a.classList.toggle("active", active);
  });
  const views = { home, identify, browse, appliance, repair, saved, search };
  (views[name] || home)(...params);
}

window.addEventListener("hashchange", () => {
  render();
  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
});

// ---------- views ----------

function home() {
  view.innerHTML = `
    <section class="hero">
      <h1>Fix it yourself. Save the service call.</h1>
      <p>Snap a photo to identify your appliance, get repair suggestions matched to the problem, and follow along with video tutorials.</p>
      <form class="search" id="home-search" role="search">
        <label class="sr-only" for="q">Describe the problem</label>
        <input id="q" type="search" placeholder="Describe the problem, e.g. “dryer not heating”" />
        <button class="btn" type="submit">Find repairs</button>
      </form>
    </section>
    <div class="feature-row">
      <a class="card" href="#/identify"><div class="icon">📷</div><h3>Identify an appliance</h3><p class="muted">Upload a photo and we'll tell you what it is, the brand and model if visible, and likely fixes.</p></a>
      <a class="card" href="#/browse"><div class="icon">🛠️</div><h3>Browse repair guides</h3><p class="muted">Step-by-step guides with tools, parts, cost and difficulty for common breakdowns.</p></a>
      <a class="card" href="#/saved"><div class="icon">📋</div><h3>Track your projects</h3><p class="muted">Check off steps as you go and pick up where you left off.</p></a>
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
    if (q) location.hash = `#/search/${encodeURIComponent(q)}`;
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
    if (q) location.hash = `#/search/${encodeURIComponent(q)}`;
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
      <div class="card"><h3>🧰 Tools</h3><ul>${r.tools.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
      <div class="card"><h3>🔩 Parts</h3>${r.parts.length ? `<ul>${r.parts.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : `<p class="muted">No parts needed.</p>`}<p class="muted" style="margin-bottom:0">Match parts to the model number on your appliance's label.</p></div>
    </div>

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
    const all = getProjects();
    all[key] = { applianceId: a.id, repairId: r.id, done: [...done], updated: Date.now() };
    saveProjects(all);
    view.querySelector("#save-btn").textContent = "✓ Saved to My Projects";
  };

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
  view.innerHTML = `<h1>My Projects</h1>${items ? `<div class="list">${items}</div>` : `<p class="muted">No projects yet. Open any repair guide and tap “Start this project” to track your progress here.</p><a class="btn" href="#/browse">Browse repairs</a>`}`;
  view.querySelectorAll("[data-remove]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const all = getProjects();
      delete all[btn.dataset.remove];
      saveProjects(all);
      saved();
    }),
  );
}

function notFound() {
  view.innerHTML = `<h1>Not found</h1><p>That guide doesn't exist. <a href="#/browse">Browse all repairs</a>.</p>`;
}

// ---------- identify ----------

function identify() {
  view.innerHTML = `
    <h1>Identify your appliance</h1>
    <p class="muted">Take a clear photo of the whole appliance, or of its model/serial label for the best match.</p>
    ${config.aiEnabled ? photoIdentifierHtml() : `<div class="notice">Photo identification isn't enabled on this server yet. Use the guided identifier below.</div>`}
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

  if (config.aiEnabled) wirePhotoIdentifier();
}

function photoIdentifierHtml() {
  return `
    <div class="stack">
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
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: prepared.image,
          mediaType: prepared.mediaType,
          problem: view.querySelector("#problem").value,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Identification failed.");
      out.innerHTML = identificationHtml(body);
    } catch (err) {
      out.innerHTML = `<div class="notice warn">${esc(err.message)}</div>`;
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
          ${videoBlock({ title: `Tutorials: ${s.symptom}`, query: s.video_search_query })}
        </div>`,
      )
      .join("")}</div>` : ""}
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

render();
