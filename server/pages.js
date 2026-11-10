// Server-rendered guide pages for search engines and people arriving from search.
// They're plain HTML (no JavaScript needed) and link into the app for the interactive parts:
// step checklists, saved projects, photo scans and exact-fit parts by model number.
import express from "express";
import {
  CATALOG,
  HAZARD_TEXT,
  findAppliance,
  findRepair,
  guideUrl,
  youtubeEmbedUrl,
  youtubeSearchUrl,
} from "../public/data/catalog.js";
import { cleanItemName, partQuery, shopLinks } from "../public/data/parts.js";

const SITE = "FixIt Home";
const DIFFICULTY = { 1: "Easy", 2: "Moderate", 3: "Advanced" };

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// JSON inside <script> must not be able to close the tag.
const jsonLd = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

export function clip(text, max = 158) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:]$/, "")}…`;
}

// Built from whole sentences, dropping the least important ones to stay within the
// ~160 characters search results show, instead of cutting off mid-sentence.
export function repairDescription(appliance, repair) {
  const sentences = [
    `${appliance.name}: ${lowerFirst(repair.symptom)}?`,
    `Likely cause: ${lowerFirst(repair.cause)}.`,
    `${DIFFICULTY[repair.difficulty]} DIY fix, ${repair.time}, ${repair.cost} in parts.`,
    "Step-by-step guide with videos.",
  ];
  const order = [1, 2, 0, 3]; // most to least important
  const keep = new Set();
  for (const i of order) {
    const next = sentences.filter((_, j) => keep.has(j) || j === i).join(" ");
    if (next.length <= 160) keep.add(i);
  }
  return clip(sentences.filter((_, j) => keep.has(j)).join(" "), 160);
}

const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

function layout({ title, description, canonical, body, structuredData = [] }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="${SITE}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta name="twitter:card" content="summary" />
  <meta name="theme-color" content="#e8590c" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="stylesheet" href="/styles.css" />
  ${structuredData.map(jsonLd).join("\n  ")}
</head>
<body>
  <header class="topbar">
    <a href="/" class="brand"><span class="brand-mark">🔧</span> ${SITE}</a>
    <nav class="nav">
      <a href="/#/identify">Identify</a>
      <a href="/guides" class="active">Repairs</a>
      <a href="/#/saved">My Projects</a>
      <a href="/#/account">Account</a>
    </nav>
  </header>
  <main>${body}</main>
  <footer class="footer">
    <p><a href="/guides">All repair guides</a> · <a href="/#/identify">Identify an appliance from a photo</a></p>
    <p>${SITE} provides general DIY guidance. Always follow your appliance's manual, turn off power, water and gas
      before working, and call a licensed professional when in doubt.</p>
  </footer>
</body>
</html>`;
}

const breadcrumbData = (origin, items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: origin + path })),
});

const breadcrumbHtml = (items) =>
  `<nav class="breadcrumb" aria-label="Breadcrumb">${items
    .map(([name, path], i) => (i === items.length - 1 ? esc(name) : `<a href="${path}">${esc(name)}</a>`))
    .join(" › ")}</nav>`;

function metaPills(r) {
  return `<div class="meta"><span class="pill d${r.difficulty}">${DIFFICULTY[r.difficulty]}</span><span class="pill">⏱ ${esc(r.time)}</span><span class="pill">💲 ${esc(r.cost)}</span>${r.videos.length ? `<span class="pill">▶ ${r.videos.length} video${r.videos.length > 1 ? "s" : ""}</span>` : ""}</div>`;
}

function guideLink(a, r) {
  return `<a class="card repair-item" href="${guideUrl(a.id, r.id)}"><div><h3>${esc(r.title)}</h3><div class="muted">${esc(r.symptom)}</div>${metaPills(r)}</div><span aria-hidden="true">›</span></a>`;
}

function videoHtml(v) {
  if (v.youtubeId) {
    return `<div class="stack"><div class="video-frame"><iframe src="${youtubeEmbedUrl(v.youtubeId)}" title="${esc(v.title)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><strong>${esc(v.title)}</strong></div>`;
  }
  return `<a class="card video-link" href="${youtubeSearchUrl(v.query)}" target="_blank" rel="noopener"><span class="video-thumb" aria-hidden="true">▶</span><span><strong>${esc(v.title)}</strong><br><span class="muted">Watch tutorials on YouTube</span></span></a>`;
}

function shopList(items, retailers, { parts = false } = {}) {
  return `<ul class="shop-list">${items
    .map((item) => {
      const links = shopLinks(parts ? partQuery(item) : cleanItemName(item), retailers);
      const linkHtml = parts
        ? `<span class="shop-links">${links.map((l) => `<a class="btn small secondary" href="${esc(l.url)}" target="_blank" rel="sponsored noopener">Buy · ${esc(l.retailer)}</a>`).join("")}</span>`
        : links[0]
          ? `<a class="shop-link" href="${esc(links[0].url)}" target="_blank" rel="sponsored noopener">Shop</a>`
          : "";
      return `<li><span>${esc(item)}</span>${linkHtml}</li>`;
    })
    .join("")}</ul>`;
}

export function renderRepairPage({ appliance: a, repair: r, origin, retailers }) {
  const path = guideUrl(a.id, r.id);
  const crumbs = [["Repair guides", "/guides"], [`${a.name} repair`, guideUrl(a.id)], [r.title, path]];
  const description = repairDescription(a, r);
  const related = a.repairs.filter((x) => x !== r);
  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: r.title,
    description,
    url: origin + path,
    tool: r.tools.map((name) => ({ "@type": "HowToTool", name })),
    supply: r.parts.map((name) => ({ "@type": "HowToSupply", name: cleanItemName(name) })),
    step: r.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
  };

  const body = `
    ${breadcrumbHtml(crumbs)}
    <article class="guide">
      <h1>${esc(r.title)}</h1>
      <p class="lead">${a.icon} <strong>${esc(r.symptom)}.</strong> The usual cause: ${esc(lowerFirst(r.cause))}.</p>
      ${metaPills(r)}
      <div class="guide-cta">
        <a class="btn" href="/#/repair/${a.id}/${r.id}">Start this repair in the app</a>
        <a class="btn secondary" href="/#/identify">Not sure? Scan your appliance</a>
      </div>
      <p class="muted" style="margin-top:8px">The app lets you check off steps as you go and finds parts that fit your model number.</p>

      <div class="notice warn"><strong>Safety first</strong><ul>${a.hazards.map((h) => `<li>${esc(HAZARD_TEXT[h])}</li>`).join("")}</ul></div>

      <div class="two-col" style="margin-top:16px">
        <section class="card"><h2 class="card-heading">🧰 Tools you'll need</h2>${shopList(r.tools, retailers)}</section>
        <section class="card"><h2 class="card-heading">🔩 Parts</h2>${r.parts.length ? shopList(r.parts, retailers, { parts: true }) : `<p class="muted">No parts needed.</p>`}
          ${r.parts.length ? `<p class="muted" style="margin-bottom:0">Check the part fits your model number. ${esc(a.identifyHints[a.identifyHints.length - 1])}.</p>` : ""}
        </section>
      </div>
      ${r.parts.length || r.tools.length ? `<p class="muted small-print">We may earn a commission from purchases made through these links, at no extra cost to you.</p>` : ""}

      <h2>Step-by-step</h2>
      <ol class="steps">${r.steps.map((s) => `<li><span>${esc(s)}</span></li>`).join("")}</ol>

      ${r.proSignals.length ? `<h2>When to call a pro</h2><div class="notice"><ul>${r.proSignals.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>` : ""}

      <h2>Video tutorials</h2>
      <div class="list">${r.videos.map(videoHtml).join("")}</div>

      ${related.length ? `<h2>Other ${esc(a.name.toLowerCase())} problems</h2><div class="list">${related.map((x) => guideLink(a, x)).join("")}</div>` : ""}
    </article>`;

  return layout({
    title: `${r.title} | ${SITE}`,
    description,
    canonical: origin + path,
    body,
    structuredData: [howTo, breadcrumbData(origin, crumbs)],
  });
}

export function renderAppliancePage({ appliance: a, origin }) {
  const path = guideUrl(a.id);
  const crumbs = [["Repair guides", "/guides"], [`${a.name} repair`, path]];
  const description = clip(
    `DIY ${a.name.toLowerCase()} repair guides: ${a.repairs.map((r) => lowerFirst(r.symptom)).join("; ")}. Step-by-step fixes with tools, parts and videos.`,
  );
  const body = `
    ${breadcrumbHtml(crumbs)}
    <h1>${a.icon} ${esc(a.name)} Repair Guides</h1>
    <p class="lead">Pick the problem you're seeing. Each guide covers the likely cause, tools, parts, steps and video tutorials.</p>
    <div class="list">${a.repairs.map((r) => guideLink(a, r)).join("")}</div>
    <div class="notice warn" style="margin-top:16px"><strong>Before you start</strong><ul>${a.hazards.map((h) => `<li>${esc(HAZARD_TEXT[h])}</li>`).join("")}</ul></div>
    <h2>Finding your model number</h2>
    <ul>${a.identifyHints.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
    <div class="guide-cta"><a class="btn" href="/#/identify">Scan your ${esc(a.name.toLowerCase())} with a photo</a></div>`;
  return layout({
    title: `${a.name} Repair: DIY Fixes & Guides | ${SITE}`,
    description,
    canonical: origin + path,
    body,
    structuredData: [breadcrumbData(origin, crumbs)],
  });
}

export function renderIndexPage({ origin }) {
  const categories = [...new Set(CATALOG.map((a) => a.category))];
  const total = CATALOG.reduce((n, a) => n + a.repairs.length, 0);
  const body = `
    ${breadcrumbHtml([["Repair guides", "/guides"]])}
    <h1>DIY Appliance Repair Guides</h1>
    <p class="lead">${total} step-by-step guides for the most common home appliance problems, with tools, parts, costs and video tutorials.</p>
    ${categories
      .map(
        (c) => `<h2>${esc(c)}</h2>${CATALOG.filter((a) => a.category === c)
          .map(
            (a) => `<section class="guide-group"><h3><a href="${guideUrl(a.id)}">${a.icon} ${esc(a.name)} repair</a></h3>
              <ul>${a.repairs.map((r) => `<li><a href="${guideUrl(a.id, r.id)}">${esc(r.title)}</a></li>`).join("")}</ul></section>`,
          )
          .join("")}`,
      )
      .join("")}`;
  return layout({
    title: `DIY Appliance Repair Guides | ${SITE}`,
    description: clip(`Free step-by-step DIY repair guides for refrigerators, dishwashers, washers, dryers, water heaters, furnaces, AC and more. Tools, parts and videos for each fix.`),
    canonical: `${origin}/guides`,
    body,
  });
}

export function renderNotFoundPage({ origin }) {
  return layout({
    title: `Page not found | ${SITE}`,
    description: "This page doesn't exist.",
    canonical: `${origin}/guides`,
    body: `<h1>Page not found</h1><p>We couldn't find that page. Try the <a href="/guides">repair guides</a> or the <a href="/">home page</a>.</p>`,
  });
}

export function renderSitemap(origin) {
  const paths = ["/", "/guides", ...CATALOG.flatMap((a) => [guideUrl(a.id), ...a.repairs.map((r) => guideUrl(a.id, r.id))])];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${esc(origin + p)}</loc></url>`).join("\n")}
</urlset>
`;
}

export function createGuidePages({ config }) {
  const router = express.Router();
  // Use APP_URL when set, so canonical links and the sitemap never depend on the Host header.
  const origin = (req) => config.appUrl || `${req.protocol}://${req.get("host")}`;
  const send = (res, html, status = 200) => {
    res.status(status).set("Cache-Control", status === 200 ? "public, max-age=3600" : "no-store").type("html").send(html);
  };

  router.get("/guides", (req, res) => send(res, renderIndexPage({ origin: origin(req) })));

  router.get("/guides/:applianceId", (req, res) => {
    const appliance = findAppliance(req.params.applianceId);
    if (!appliance) return send(res, renderNotFoundPage({ origin: origin(req) }), 404);
    send(res, renderAppliancePage({ appliance, origin: origin(req) }));
  });

  router.get("/guides/:applianceId/:repairId", (req, res) => {
    const appliance = findAppliance(req.params.applianceId);
    const repair = findRepair(req.params.applianceId, req.params.repairId);
    if (!appliance || !repair) return send(res, renderNotFoundPage({ origin: origin(req) }), 404);
    send(res, renderRepairPage({ appliance, repair, origin: origin(req), retailers: config.retailers }));
  });

  router.get("/sitemap.xml", (req, res) => {
    res.set("Cache-Control", "public, max-age=3600").type("application/xml").send(renderSitemap(origin(req)));
  });

  router.get("/robots.txt", (req, res) => {
    res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin(req)}/sitemap.xml\n`);
  });

  return router;
}
