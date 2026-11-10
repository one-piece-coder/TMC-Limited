import { test } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { CATALOG, findRepair, searchCatalog } from "../public/data/catalog.js";
import { cleanItemName, partQuery, shopLinks } from "../public/data/parts.js";
import { InputError, sanitizeResult, validateImageInput } from "../server/identify.js";
import { createApp } from "../server/index.js";
import { openDatabase } from "../server/db.js";
import { buildRetailers, loadConfig } from "../server/config.js";
import { hashPassword, verifyPassword } from "../server/auth.js";

// ---------- catalog & helpers ----------

test("catalog entries are complete and ids are unique", () => {
  const ids = new Set();
  for (const a of CATALOG) {
    assert.ok(a.id && a.name && a.icon && a.category, `appliance ${a.id} missing fields`);
    assert.ok(a.repairs.length > 0);
    for (const r of a.repairs) {
      assert.ok(!ids.has(r.id), `duplicate repair id ${r.id}`);
      ids.add(r.id);
      assert.ok([1, 2, 3].includes(r.difficulty));
      assert.ok(r.steps.length >= 3, `${r.id} needs steps`);
      assert.ok(r.videos.length >= 1, `${r.id} needs a video`);
      for (const v of r.videos) assert.ok(v.youtubeId || v.query, `${r.id} video needs id or query`);
    }
  }
});

test("search finds relevant repairs", () => {
  const [top] = searchCatalog("dryer not heating");
  assert.equal(top.appliance.id, "dryer");
  assert.equal(findRepair("toilet", "toilet-running").id, "toilet-running");
});

test("image validation", () => {
  assert.throws(() => validateImageInput({ image: "", mediaType: "image/png" }), InputError);
  assert.throws(() => validateImageInput({ image: "abcd", mediaType: "image/tiff" }), InputError);
  assert.throws(() => validateImageInput({ image: "not base64!", mediaType: "image/png" }), InputError);
  assert.equal(validateImageInput({ image: "data:image/png;base64,aGVsbG8=", mediaType: "image/png" }), "aGVsbG8=");
});

test("sanitizeResult drops repair ids from other appliances", () => {
  const out = sanitizeResult({ catalog_id: "dryer", suggested_repair_ids: ["dryer-no-heat", "toilet-running", "bogus"] });
  assert.deepEqual(out.suggested_repair_ids, ["dryer-no-heat"]);
});

test("password hashing round-trips and rejects wrong passwords", async () => {
  const hash = await hashPassword("correct horse");
  assert.equal(await verifyPassword("correct horse", hash), true);
  assert.equal(await verifyPassword("wrong", hash), false);
  assert.equal(await verifyPassword("anything", undefined), false);
});

test("parts links include model number and affiliate tag", () => {
  assert.equal(cleanItemName("Condenser fan motor (only if it does not spin)"), "Condenser fan motor");
  assert.equal(partQuery("Thermal fuse", { brand: "Whirlpool", modelNumber: "WED4815EW1" }), "Whirlpool WED4815EW1 Thermal fuse");
  const retailers = buildRetailers({
    AMAZON_ASSOCIATE_TAG: "fixit-20",
    PARTS_RETAILERS: JSON.stringify([
      { name: "PartsCo", template: "https://parts.example/search?q={query}&aff=7" },
      { name: "Bad", template: "http://insecure.example/{query}" },
    ]),
  });
  assert.deepEqual(retailers.map((r) => r.name), ["Amazon", "PartsCo"]);
  const links = shopLinks("Thermal fuse", retailers);
  assert.equal(links[0].url, "https://www.amazon.com/s?k=Thermal%20fuse&tag=fixit-20");
  assert.equal(links[1].url, "https://parts.example/search?q=Thermal%20fuse&aff=7");
});

// ---------- HTTP helpers ----------

const WEBHOOK_SECRET = "whsec_test_secret";

function makeApp(overrides = {}) {
  const db = openDatabase(":memory:");
  const config = {
    ...loadConfig({}),
    stripePriceId: "price_123",
    stripeWebhookSecret: WEBHOOK_SECRET,
    ...overrides.config,
  };
  const app = createApp({
    db,
    config,
    isAiConfigured: () => true,
    identify: async ({ image }) => {
      if (!image) throw new InputError("An image is required.");
      return { is_appliance: true, catalog_id: "dryer" };
    },
    stripe: null,
    // Collects emails instead of printing them; tests that check email pass their own.
    mailer: { enabled: true, send: async () => {} },
    ...overrides,
    ...(overrides.config ? { config } : {}),
  });
  return { app, db };
}

async function withServer(app, fn) {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    server.close();
  }
}

// Minimal cookie-keeping client.
function client(base) {
  let cookie = "";
  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  };
  return {
    cookieHeader: () => cookie,
    get: (p) => call("GET", p),
    post: (p, b = {}) => call("POST", p, b),
    put: (p, b = {}) => call("PUT", p, b),
    patch: (p, b = {}) => call("PATCH", p, b),
    del: (p) => call("DELETE", p, {}),
  };
}

// ---------- accounts ----------

test("sign up, sign in, sign out", async () => {
  const { app } = makeApp();
  await withServer(app, async (base) => {
    const c = client(base);
    assert.equal((await c.get("/api/me")).data.user, null);
    assert.equal((await c.post("/api/signup", { email: "bad", password: "password1" })).status, 400);
    assert.equal((await c.post("/api/signup", { email: "a@b.co", password: "short" })).status, 400);

    const signup = await c.post("/api/signup", { email: "Pat@Example.com", password: "password1" });
    assert.equal(signup.status, 201);
    assert.equal(signup.data.user.email, "pat@example.com");
    assert.equal(signup.data.user.plan, "free");
    assert.equal((await c.post("/api/signup", { email: "pat@example.com", password: "password1" })).status, 409);

    assert.equal((await c.get("/api/me")).data.user.email, "pat@example.com");
    await c.post("/api/logout");
    assert.equal((await c.get("/api/me")).data.user, null);

    assert.equal((await c.post("/api/login", { email: "pat@example.com", password: "nope-nope" })).status, 401);
    assert.equal((await c.post("/api/login", { email: "PAT@example.com", password: "password1" })).status, 200);
    assert.equal((await c.get("/api/me")).data.user.email, "pat@example.com");
  });
});

test("state-changing requests must be JSON (CSRF protection)", async () => {
  const { app } = makeApp();
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/signup`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "email=a@b.co&password=password1",
    });
    assert.equal(res.status, 415);
  });
});

test("sign-in attempts are rate limited", async () => {
  const { app } = makeApp();
  await withServer(app, async (base) => {
    const c = client(base);
    let last;
    for (let i = 0; i < 21; i++) last = await c.post("/api/login", { email: "x@y.co", password: "password1" });
    assert.equal(last.status, 429);
  });
});

// ---------- scanning & quota ----------

test("scanning requires an account and enforces the free monthly quota", async () => {
  const { app, db } = makeApp({ config: { freeScansPerMonth: 2 } });
  await withServer(app, async (base) => {
    const c = client(base);
    const photo = { image: "aGVsbG8=", mediaType: "image/png" };
    assert.equal((await c.post("/api/identify", photo)).status, 401);

    await c.post("/api/signup", { email: "pat@example.com", password: "password1" });
    db.markEmailVerified(db.userByEmail("pat@example.com").id);
    // Failed scans are refunded.
    assert.equal((await c.post("/api/identify", {})).status, 400);

    const first = await c.post("/api/identify", photo);
    assert.equal(first.status, 200);
    assert.equal(first.data.catalog_id, "dryer");
    assert.deepEqual(first.data.usage, { used: 1, limit: 2, remaining: 1 });
    assert.equal((await c.post("/api/identify", photo)).status, 200);

    const blocked = await c.post("/api/identify", photo);
    assert.equal(blocked.status, 402);
    assert.equal(blocked.data.code, "upgrade_required");
  });
});

test("returns 503 for scans when AI isn't configured", async () => {
  const { app } = makeApp({ isAiConfigured: () => false });
  await withServer(app, async (base) => {
    const c = client(base);
    assert.equal((await c.get("/api/config")).data.aiEnabled, false);
    await c.post("/api/signup", { email: "pat@example.com", password: "password1" });
    assert.equal((await c.post("/api/identify", { image: "aGVsbG8=", mediaType: "image/png" })).status, 503);
  });
});

// ---------- projects ----------

test("projects sync per account and keep the newest version", async () => {
  const { app } = makeApp();
  await withServer(app, async (base) => {
    const c = client(base);
    assert.equal((await c.get("/api/projects")).status, 401);
    await c.post("/api/signup", { email: "pat@example.com", password: "password1" });

    assert.equal((await c.put("/api/projects/dryer/dryer-no-heat", { done: [0, 1], updated: 2000 })).status, 200);
    await c.put("/api/projects/dryer/dryer-no-heat", { done: [0], updated: 1000 }); // older: ignored
    assert.equal((await c.put("/api/projects/dryer/x", { done: ["a"] })).status, 400);

    const { projects } = (await c.get("/api/projects")).data;
    assert.equal(projects.length, 1);
    assert.deepEqual(projects[0].done, [0, 1]);

    const other = client(base);
    await other.post("/api/signup", { email: "sam@example.com", password: "password1" });
    assert.equal((await other.get("/api/projects")).data.projects.length, 0);

    await c.del("/api/projects/dryer/dryer-no-heat");
    assert.equal((await c.get("/api/projects")).data.projects.length, 0);
  });
});

// ---------- billing ----------

test("upgrades are disabled without Stripe", async () => {
  const { app } = makeApp();
  await withServer(app, async (base) => {
    const c = client(base);
    assert.equal((await c.get("/api/config")).data.billingEnabled, false);
    await c.post("/api/signup", { email: "pat@example.com", password: "password1" });
    assert.equal((await c.post("/api/billing/checkout")).status, 503);
  });
});

test("checkout creates a customer and session; webhooks switch the plan", async () => {
  const realStripe = new Stripe("sk_test_dummy");
  const calls = [];
  const fakeStripe = {
    webhooks: realStripe.webhooks,
    customers: { create: async (p) => (calls.push(["customer", p]), { id: "cus_1" }) },
    checkout: { sessions: { create: async (p) => (calls.push(["checkout", p]), { url: "https://checkout.stripe.test/s" }) } },
    billingPortal: { sessions: { create: async () => ({ url: "https://billing.stripe.test/p" }) } },
    subscriptions: { retrieve: async (id) => ({ id, customer: "cus_1", status: "active" }) },
  };
  const { app } = makeApp({ stripe: fakeStripe });

  await withServer(app, async (base) => {
    const c = client(base);
    assert.equal((await c.post("/api/billing/checkout")).status, 401);
    await c.post("/api/signup", { email: "pat@example.com", password: "password1" });

    const checkout = await c.post("/api/billing/checkout");
    assert.equal(checkout.data.url, "https://checkout.stripe.test/s");
    const session = calls.find(([k]) => k === "checkout")[1];
    assert.equal(session.customer, "cus_1");
    assert.equal(session.mode, "subscription");
    assert.deepEqual(session.line_items, [{ price: "price_123", quantity: 1 }]);

    const sendEvent = (event, secret = WEBHOOK_SECRET) => {
      const payload = JSON.stringify(event);
      const signature = realStripe.webhooks.generateTestHeaderString({ payload, secret });
      return fetch(`${base}/api/stripe/webhook`, {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": signature },
        body: payload,
      });
    };

    const completed = {
      id: "evt_1",
      object: "event",
      type: "checkout.session.completed",
      data: { object: { client_reference_id: "1", customer: "cus_1", subscription: "sub_1" } },
    };
    assert.equal((await sendEvent(completed, "whsec_wrong")).status, 400);
    assert.equal((await sendEvent(completed)).status, 200);
    const me = (await c.get("/api/me")).data.user;
    assert.equal(me.plan, "pro");
    assert.equal(me.usage.limit, 100);
    assert.equal((await c.post("/api/billing/portal")).data.url, "https://billing.stripe.test/p");

    await sendEvent({
      id: "evt_2",
      object: "event",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_1", customer: "cus_1", status: "canceled" } },
    });
    assert.equal((await c.get("/api/me")).data.user.plan, "free");
  });
});

test("serves the app at / and a real 404 for unknown paths", async () => {
  const { app } = makeApp();
  await withServer(app, async (base) => {
    assert.match(await (await fetch(`${base}/`)).text(), /id="view"/);
    const junk = await fetch(`${base}/repair/dryer/dryer-no-heat`);
    assert.equal(junk.status, 404);
    assert.match(await junk.text(), /Page not found/);
  });
});

// ---------- search-friendly guide pages ----------

test("every guide has a unique search title and the homepage links to every appliance page", async () => {
  const fs = await import("node:fs");
  const titles = CATALOG.flatMap((a) => a.repairs.map((r) => r.title));
  assert.ok(titles.every((t) => typeof t === "string" && t.length >= 15 && t.length <= 70), "titles 15-70 chars");
  assert.equal(new Set(titles).size, titles.length);
  const shell = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  for (const a of CATALOG) assert.ok(shell.includes(`href="/guides/${a.id}"`), `footer links ${a.id}`);
});

test("guide pages are complete, crawlable HTML", async () => {
  const { app } = makeApp({ config: { appUrl: "https://fixit.example", retailers: buildRetailers({ AMAZON_ASSOCIATE_TAG: "fixit-20" }) } });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/guides/dryer/dryer-no-heat`, { headers: { host: "evil.example" } });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("cache-control"), /public/);
    const html = await res.text();
    assert.match(html, /<title>How to Fix a Dryer That Won&#39;t Heat \| FixIt Home<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]{50,160}"/);
    // Canonical uses APP_URL, never the request's Host header.
    assert.match(html, /<link rel="canonical" href="https:\/\/fixit\.example\/guides\/dryer\/dryer-no-heat"/);
    assert.ok(!html.includes("evil.example"));
    // Content is in the HTML itself, not drawn later by JavaScript.
    assert.match(html, /Test the thermal fuse for continuity/);
    assert.ok(!html.includes("app.js"));
    assert.match(html, /tag=fixit-20/);
    assert.match(html, /rel="sponsored noopener"/);
    assert.match(html, /href="\/#\/repair\/dryer\/dryer-no-heat"/);

    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
    const howTo = blocks.find((b) => b["@type"] === "HowTo");
    assert.equal(howTo.step.length, findRepair("dryer", "dryer-no-heat").steps.length);
    assert.equal(blocks.find((b) => b["@type"] === "BreadcrumbList").itemListElement.length, 3);

    const appliancePage = await (await fetch(`${base}/guides/dryer`)).text();
    assert.match(appliancePage, /Clothes Dryer Repair Guides/);
    assert.match(appliancePage, /href="\/guides\/dryer\/dryer-squeaking"/);

    const index = await (await fetch(`${base}/guides`)).text();
    for (const a of CATALOG) for (const r of a.repairs) assert.ok(index.includes(`href="/guides/${a.id}/${r.id}"`));

    assert.equal((await fetch(`${base}/guides/dryer/nope`)).status, 404);
    assert.equal((await fetch(`${base}/guides/nope`)).status, 404);
  });
});

test("sitemap and robots.txt list every guide", async () => {
  const { app } = makeApp({ config: { appUrl: "https://fixit.example" } });
  await withServer(app, async (base) => {
    const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
    const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    const guideCount = CATALOG.reduce((n, a) => n + 1 + a.repairs.length, 0);
    assert.equal(locs.length, guideCount + 4);
    assert.ok(locs.includes("https://fixit.example/privacy") && locs.includes("https://fixit.example/terms"));
    assert.ok(locs.includes("https://fixit.example/guides/toilet/toilet-running"));
    const robots = await (await fetch(`${base}/robots.txt`)).text();
    assert.match(robots, /Disallow: \/api\//);
    assert.match(robots, /Sitemap: https:\/\/fixit\.example\/sitemap\.xml/);
  });
});

// ---------- password reset ----------

function captureMailer() {
  const sent = [];
  return { sent, mailer: { enabled: true, send: async (msg) => sent.push(msg) } };
}
const tick = () => new Promise((r) => setTimeout(r, 20));
const tokenFrom = (msg) => msg.text.match(/#\/(?:reset|verify)\?token=([\w-]+)/)[1];

test("password reset: emails a one-time link, changes the password, signs out other devices", async () => {
  const { sent, mailer } = captureMailer();
  const { app } = makeApp({ mailer, config: { appUrl: "https://fixit.example" } });
  await withServer(app, async (base) => {
    const phone = client(base);
    const laptop = client(base);
    await phone.post("/api/signup", { email: "pat@example.com", password: "old-password" });
    await laptop.post("/api/login", { email: "pat@example.com", password: "old-password" });

    // Unknown emails get the same answer and no email.
    const unknown = await client(base).post("/api/password/forgot", { email: "nobody@example.com" });
    const known = await client(base).post("/api/password/forgot", { email: "PAT@example.com" });
    assert.equal(unknown.status, 200);
    assert.deepEqual(unknown.data, known.data);
    await tick();
    const resets = sent.filter((m) => /^Reset/.test(m.subject));
    assert.equal(resets.length, 1);
    assert.equal(resets[0].to, "pat@example.com");
    assert.match(resets[0].text, /^https:\/\/fixit\.example\/#\/reset\?token=/m);
    const token = tokenFrom(resets[0]);

    const anon = client(base);
    assert.equal((await anon.post("/api/password/reset", { token, password: "short" })).status, 400);
    assert.equal((await anon.post("/api/password/reset", { token: "wrong", password: "new-password" })).data.code, "bad_token");

    const ok = await anon.post("/api/password/reset", { token, password: "new-password" });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.user.email, "pat@example.com");
    assert.equal((await anon.get("/api/me")).data.user.email, "pat@example.com");

    // The link only works once, existing sessions are signed out, and only the new password works.
    assert.equal((await anon.post("/api/password/reset", { token, password: "another-pass" })).status, 400);
    assert.equal((await phone.get("/api/me")).data.user, null);
    assert.equal((await laptop.get("/api/me")).data.user, null);
    assert.equal((await client(base).post("/api/login", { email: "pat@example.com", password: "old-password" })).status, 401);
    assert.equal((await client(base).post("/api/login", { email: "pat@example.com", password: "new-password" })).status, 200);
  });
});

test("password reset: a newer link replaces the old one, and links expire", async () => {
  const { sent, mailer } = captureMailer();
  const { app, db } = makeApp({ mailer });
  await withServer(app, async (base) => {
    const c = client(base);
    await c.post("/api/signup", { email: "pat@example.com", password: "old-password" });
    await c.post("/api/password/forgot", { email: "pat@example.com" });
    await c.post("/api/password/forgot", { email: "pat@example.com" });
    await tick();
    const [first, second] = sent.filter((m) => /^Reset/.test(m.subject)).map(tokenFrom);
    assert.equal((await c.post("/api/password/reset", { token: first, password: "new-password" })).status, 400);

    db.raw.exec("UPDATE password_resets SET expires_at = 0");
    assert.equal((await c.post("/api/password/reset", { token: second, password: "new-password" })).status, 400);
  });
});

test("password reset is off in production without email or APP_URL", async () => {
  const { mailer } = captureMailer();
  const { app } = makeApp({ mailer, config: { production: true, appUrl: "" } });
  await withServer(app, async (base) => {
    const c = client(base);
    assert.equal((await c.get("/api/config")).data.passwordResetEnabled, false);
    assert.equal((await c.post("/api/password/forgot", { email: "pat@example.com" })).status, 503);
  });
  const { createMailer } = await import("../server/email.js");
  assert.equal(createMailer({ production: true, smtpUrl: "" }).enabled, false);
  assert.equal(createMailer({ production: false, smtpUrl: "" }).enabled, true);
});

// ---------- turnkey business features ----------

import { brandCss, contrast, validateSettings } from "../server/business.js";
import { leadsToCsv, validateLead } from "../server/leads.js";

const SETUP = { setupCode: "letmein123" };

async function ownerClient(base) {
  const c = client(base);
  const res = await c.post("/api/setup", { code: "letmein123", email: "owner@shop.com", password: "owner-pass" });
  assert.equal(res.status, 200);
  return c;
}

test("first-time setup needs the setup code and only works once", async () => {
  const { app } = makeApp({ config: SETUP });
  await withServer(app, async (base) => {
    const c = client(base);
    assert.equal((await c.get("/api/config")).data.setupNeeded, true);
    assert.equal((await c.post("/api/setup", { code: "wrong", email: "x@y.co", password: "password1" })).status, 403);
    const owner = await ownerClient(base);
    assert.equal((await owner.get("/api/me")).data.user.isOwner, true);
    assert.equal((await c.get("/api/config")).data.setupNeeded, false);
    assert.equal((await c.post("/api/setup", { code: "letmein123", email: "y@y.co", password: "password1" })).status, 409);
  });
});

test("an existing account can be made owner only with its password", async () => {
  const { app } = makeApp({ config: SETUP });
  await withServer(app, async (base) => {
    await client(base).post("/api/signup", { email: "owner@shop.com", password: "real-pass" });
    const attacker = client(base);
    assert.equal((await attacker.post("/api/setup", { code: "letmein123", email: "owner@shop.com", password: "guess-pass" })).status, 401);
    const owner = client(base);
    assert.equal((await owner.post("/api/setup", { code: "letmein123", email: "owner@shop.com", password: "real-pass" })).status, 200);
  });
});

test("dashboard is owner-only", async () => {
  const { app } = makeApp({ config: SETUP });
  await withServer(app, async (base) => {
    const c = client(base);
    assert.equal((await c.get("/api/admin/overview")).status, 401);
    await c.post("/api/signup", { email: "member@x.com", password: "password1" });
    assert.equal((await c.get("/api/admin/overview")).status, 403);
    assert.equal((await c.get("/api/admin/leads.csv")).status, 403);
    assert.equal((await c.put("/api/admin/settings", { businessName: "Hacked" })).status, 403);
  });
});

test("business settings rebrand the app shell, guide pages, manifest and emails", async () => {
  const { sent, mailer } = captureMailer();
  const { app } = makeApp({ mailer, config: { ...SETUP, appUrl: "https://acme.example" } });
  await withServer(app, async (base) => {
    const owner = await ownerClient(base);
    assert.equal((await owner.put("/api/admin/settings", { businessName: "" })).status, 400);
    assert.equal((await owner.put("/api/admin/settings", { brandColor: "red" })).status, 400);
    const saved = await owner.put("/api/admin/settings", {
      businessName: "Acme <Appliance> Repair",
      phone: "(512) 555-0199",
      serviceArea: "Austin, TX",
      brandColor: "#1971C2",
      logoEmoji: "⚡",
      evil: "ignored",
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.data.settings.brandColor, "#1971c2");
    assert.equal(saved.data.settings.evil, undefined);

    const shell = await (await fetch(`${base}/`)).text();
    assert.match(shell, /<title>Acme &lt;Appliance&gt; Repair: Identify/);
    assert.ok(!shell.includes("{{"), "no leftover placeholders");
    assert.match(shell, /<style id="brand-css">/);

    const guide = await (await fetch(`${base}/guides/dryer/dryer-no-heat`)).text();
    assert.match(guide, /\| Acme &lt;Appliance&gt; Repair<\/title>/);
    assert.match(guide, /href="tel:5125550199"/);
    assert.match(guide, /href="\/#\/book\?appliance=dryer&amp;repair=dryer-no-heat"|href="\/#\/book\?appliance=dryer&repair=dryer-no-heat"/);
    assert.match(guide, /"@type":"HomeAndConstructionBusiness"/);
    assert.ok(!guide.includes("FixIt Home"));

    const manifest = await (await fetch(`${base}/manifest.webmanifest`)).json();
    assert.equal(manifest.name, "Acme <Appliance> Repair");

    const config = (await client(base).get("/api/config")).data;
    assert.equal(config.brand.phone, "(512) 555-0199");
    assert.equal(config.brand.leadEmail, undefined, "private settings stay private");

    await client(base).post("/api/password/forgot", { email: "owner@shop.com" });
    await tick();
    assert.equal(sent.at(-1).subject, "Reset your Acme <Appliance> Repair password");
  });
});

test("brand colors stay readable", () => {
  assert.equal(brandCss("#e8590c"), "", "default color needs no override");
  for (const color of ["#ffeb3b", "#00ff00", "#1971c2", "#000000"]) {
    const css = brandCss(color);
    const light = css.match(/--accent:(#[0-9a-f]{6})/)[1];
    const ink = css.match(/--accent-ink:(#[0-9a-f]{6})/)[1];
    assert.ok(contrast(light, "#fffaf5") >= 4.5, `${color} accent readable on light`);
    assert.ok(contrast(ink, light) >= 4.5, `${color} button text readable`);
  }
  assert.deepEqual(validateSettings({ bookingEnabled: 0 }).values, { bookingEnabled: false });
});

test("service requests are saved, emailed to the owner, and spam-guarded", async () => {
  const { sent, mailer } = captureMailer();
  const { app } = makeApp({ mailer, config: { ...SETUP, appUrl: "https://acme.example" } });
  await withServer(app, async (base) => {
    const owner = await ownerClient(base);
    await owner.put("/api/admin/settings", { businessName: "Acme Repair", leadEmail: "jobs@acme.example" });
    const visitor = client(base);
    const lead = { name: "Jo", phone: "512-555-0100", zip: "78701", applianceId: "dryer", repairId: "dryer-no-heat", message: "No heat", consent: true };

    assert.equal((await visitor.post("/api/leads", { ...lead, phone: "12" })).status, 400);
    assert.equal((await visitor.post("/api/leads", { ...lead, consent: false })).status, 400);
    assert.equal((await visitor.post("/api/leads", lead)).status, 201);
    // Bot filled the hidden field: looks successful, but nothing is saved.
    assert.equal((await visitor.post("/api/leads", { ...lead, name: "Bot", website: "spam.example" })).status, 201);
    await tick();

    const jobs = sent.filter((m) => /^New repair request/.test(m.subject));
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].to, "jobs@acme.example");
    assert.match(jobs[0].subject, /New repair request: Jo \(Clothes Dryer\)/);
    assert.match(jobs[0].text, /They were reading: How to Fix a Dryer That Won't Heat/);
    assert.match(jobs[0].text, /https:\/\/acme\.example\/#\/admin/);

    const { leads } = (await owner.get("/api/admin/leads")).data;
    assert.equal(leads.length, 1);
    assert.equal(leads[0].status, "new");
    const id = leads[0].id;
    assert.equal((await visitor.patch(`/api/admin/leads/${id}`, { status: "won" })).status, 401);
    assert.equal((await owner.patch(`/api/admin/leads/${id}`, { status: "bogus" })).status, 400);
    const updated = await owner.patch(`/api/admin/leads/${id}`, { status: "scheduled", notes: "Tue 10am" });
    assert.equal(updated.data.lead.status, "scheduled");
    assert.equal(updated.data.lead.notes, "Tue 10am");
    assert.equal((await owner.get("/api/admin/leads?status=scheduled")).data.leads.length, 1);
    assert.equal((await owner.get("/api/admin/leads?status=new")).data.leads.length, 0);

    const csvRes = await fetch(`${base}/api/admin/leads.csv`, { headers: { cookie: owner.cookieHeader() } });
    assert.match(csvRes.headers.get("content-disposition"), /attachment; filename="service-requests-/);
    assert.match(await csvRes.text(), /Jo,512-555-0100/);

    const overview = (await owner.get("/api/admin/overview")).data;
    assert.equal(overview.stats.leadsThisMonth, 1);
    assert.equal(overview.stats.leadsByStatus.scheduled, 1);
    const item = (id) => overview.checklist.find((c) => c.id === id);
    assert.equal(item("appUrl").done, true);
    assert.equal(item("billing").done, false);
    assert.equal(item("profile").done, false, "no phone/service area yet");

    // Deleting a request (spam, or a customer's deletion request).
    assert.equal((await visitor.del(`/api/admin/leads/${id}`)).status, 401);
    assert.equal((await owner.del(`/api/admin/leads/${id}`)).status, 200);
    assert.equal((await owner.del(`/api/admin/leads/${id}`)).status, 404);
    assert.equal((await owner.get("/api/admin/leads")).data.leads.length, 0);

    // Booking can be switched off.
    await owner.put("/api/admin/settings", { bookingEnabled: false });
    assert.equal((await client(base).post("/api/leads", lead)).status, 503);
  });
});

test("lead validation and CSV export are safe", () => {
  const { lead } = validateLead({ name: "  Jo  ", phone: "5125550100", applianceId: "nope", repairId: "x", consent: true });
  assert.equal(lead.name, "Jo");
  assert.equal(lead.applianceId, "");
  assert.equal(lead.repairId, "");
  const csv = leadsToCsv([
    { created_at: 0, status: "new", name: "=HYPERLINK(\"http://evil\")", phone: "+1 512", email: "", zip: "", appliance_id: "", repair_id: "", preferred_time: "", message: "a,b\nc", notes: "" },
  ]);
  assert.match(csv, /"'=HYPERLINK\(""http:\/\/evil""\)"/);
  assert.match(csv, /,'\+1 512,/);
  assert.match(csv, /"a,b\nc"/);
});

test("older databases gain the owner role column", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const { DatabaseSync } = await import("node:sqlite");
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "fixit-")), "old.db");
  const old = new DatabaseSync(file);
  old.exec("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'free', stripe_customer_id TEXT UNIQUE, subscription_status TEXT, created_at INTEGER NOT NULL)");
  old.exec("INSERT INTO users (email, password_hash, created_at) VALUES ('a@b.co', 'x', 1)");
  old.close();
  const db = openDatabase(file);
  assert.equal(db.userByEmail("a@b.co").role, "user");
  assert.equal(db.ownerCount(), 0);
});

test("health check and owner backup download", async () => {
  const { app } = makeApp({ config: SETUP });
  await withServer(app, async (base) => {
    assert.deepEqual(await (await fetch(`${base}/healthz`)).json(), { ok: true });
    assert.equal((await fetch(`${base}/api/admin/backup`)).status, 401);
    const owner = await ownerClient(base);
    const res = await fetch(`${base}/api/admin/backup`, { headers: { cookie: owner.cookieHeader() } });
    assert.equal(res.status, 200);
    const bytes = Buffer.from(await res.arrayBuffer());
    assert.equal(bytes.subarray(0, 15).toString(), "SQLite format 3");
  });
});

test("APP_URL falls back to Render's address", () => {
  assert.equal(loadConfig({ RENDER_EXTERNAL_URL: "https://shop.onrender.com/" }).appUrl, "https://shop.onrender.com");
  assert.equal(loadConfig({ APP_URL: "https://shop.com", RENDER_EXTERNAL_URL: "https://x.onrender.com" }).appUrl, "https://shop.com");
});

// ---------- email verification ----------

test("new accounts must confirm their email before scanning", async () => {
  const { sent, mailer } = captureMailer();
  const { app } = makeApp({ mailer, config: { appUrl: "https://fixit.example" } });
  await withServer(app, async (base) => {
    const c = client(base);
    const photo = { image: "aGVsbG8=", mediaType: "image/png" };
    const signup = await c.post("/api/signup", { email: "pat@example.com", password: "password1" });
    assert.equal(signup.data.user.emailVerified, false);
    assert.equal((await c.get("/api/config")).data.verificationRequired, true);
    await tick();
    const welcome = sent.filter((m) => /^Confirm your email/.test(m.subject));
    assert.equal(welcome.length, 1);
    assert.match(welcome[0].text, /^https:\/\/fixit\.example\/#\/verify\?token=/m);

    const blocked = await c.post("/api/identify", photo);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.data.code, "verify_email");

    // Resending replaces the old link.
    await c.post("/api/email/resend");
    await tick();
    const [oldLink, newLink] = sent.filter((m) => /^Confirm/.test(m.subject)).map(tokenFrom);
    assert.equal((await c.post("/api/email/verify", { token: oldLink })).data.code, "bad_token");

    // The link works from any browser, even signed out.
    const ok = await client(base).post("/api/email/verify", { token: newLink });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.user, null, "doesn't reveal account details to another browser");
    assert.equal((await c.get("/api/me")).data.user.emailVerified, true);
    assert.equal((await c.post("/api/identify", photo)).status, 200);
    assert.equal((await client(base).post("/api/email/verify", { token: newLink })).status, 400, "one-time link");
    assert.equal((await c.post("/api/email/resend")).data.alreadyVerified, true);
  });
});

test("verification is skipped when the site can't send email, and resends are limited", async () => {
  const { app } = makeApp({ mailer: { enabled: false, send: async () => {} }, config: { production: true } });
  await withServer(app, async (base) => {
    const c = client(base);
    await c.post("/api/signup", { email: "pat@example.com", password: "password1" });
    assert.equal((await c.get("/api/config")).data.verificationRequired, false);
    assert.equal((await c.post("/api/identify", { image: "aGVsbG8=", mediaType: "image/png" })).status, 200);
  });

  const { app: app2 } = makeApp();
  await withServer(app2, async (base) => {
    const c = client(base);
    await c.post("/api/signup", { email: "sam@example.com", password: "password1" });
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await c.post("/api/email/resend")).status);
    assert.deepEqual(statuses, [200, 200, 200, 429]);
  });
});

test("a password reset also confirms the email", async () => {
  const { sent, mailer } = captureMailer();
  const { app } = makeApp({ mailer });
  await withServer(app, async (base) => {
    const c = client(base);
    await c.post("/api/signup", { email: "pat@example.com", password: "password1" });
    await c.post("/api/password/forgot", { email: "pat@example.com" });
    await tick();
    const token = tokenFrom(sent.find((m) => /^Reset/.test(m.subject)));
    const res = await c.post("/api/password/reset", { token, password: "password2" });
    assert.equal(res.data.user.emailVerified, true);
  });
});

// ---------- delete account ----------

test("members can delete their account and data", async () => {
  const { app, db } = makeApp({ config: SETUP });
  await withServer(app, async (base) => {
    const c = client(base);
    await c.post("/api/signup", { email: "pat@example.com", password: "password1" });
    const userId = db.userByEmail("pat@example.com").id;
    db.markEmailVerified(userId);
    await c.put("/api/projects/dryer/dryer-no-heat", { done: [0] });
    await c.post("/api/identify", { image: "aGVsbG8=", mediaType: "image/png" });
    await c.post("/api/leads", { name: "Pat", phone: "5125550100", consent: true });

    assert.equal((await c.del("/api/account")).status, 401, "needs password");
    const res = await fetch(`${base}/api/account`, {
      method: "DELETE",
      headers: { "content-type": "application/json", cookie: c.cookieHeader() },
      body: JSON.stringify({ password: "password1" }),
    });
    assert.equal(res.status, 200);
    assert.equal(db.userByEmail("pat@example.com"), undefined);
    assert.equal(db.countScansSince(userId, 0), 0);
    assert.equal(db.listProjects(userId).length, 0);
    assert.equal((await c.get("/api/me")).data.user, null, "signed out");
    // The service request stays with the business, unlinked from the deleted account.
    const [lead] = db.listLeads();
    assert.equal(lead.name, "Pat");
    assert.equal(lead.user_id, null);
    assert.equal((await client(base).post("/api/login", { email: "pat@example.com", password: "password1" })).status, 401);
  });
});

test("Pro members and the owner can't delete their account by accident", async () => {
  const { app, db } = makeApp({ config: SETUP });
  await withServer(app, async (base) => {
    const owner = await ownerClient(base);
    const del = (c, password) =>
      fetch(`${base}/api/account`, {
        method: "DELETE",
        headers: { "content-type": "application/json", cookie: c.cookieHeader() },
        body: JSON.stringify({ password }),
      });
    assert.equal((await del(owner, "owner-pass")).status, 409);

    const pro = client(base);
    await pro.post("/api/signup", { email: "pro@example.com", password: "password1" });
    db.setPlan(db.userByEmail("pro@example.com").id, "pro", "active");
    const res = await del(pro, "password1");
    assert.equal(res.status, 409);
    assert.equal((await res.json()).code, "cancel_first");
  });
});

// ---------- legal pages ----------

test("privacy policy and terms are filled in from business settings", async () => {
  const { app } = makeApp({ config: { ...SETUP, appUrl: "https://acme.example" } });
  await withServer(app, async (base) => {
    let privacy = await (await fetch(`${base}/privacy`)).text();
    let terms = await (await fetch(`${base}/terms`)).text();
    assert.match(privacy, /<h1>Privacy Policy<\/h1>/);
    assert.match(privacy, /We don't save your photo/);
    assert.match(privacy, /We do not sell your personal information/);
    assert.match(terms, /DIY repairs are at your own risk/);
    assert.ok(!terms.includes("Governing law"), "no state set yet");
    assert.match(privacy, /<link rel="canonical" href="https:\/\/acme\.example\/privacy"/);

    const owner = await ownerClient(base);
    await owner.put("/api/admin/settings", {
      businessName: "Acme Repair",
      contactEmail: "help@acme.example",
      phone: "512-555-0199",
      governingState: "Texas",
    });
    privacy = await (await fetch(`${base}/privacy`)).text();
    terms = await (await fetch(`${base}/terms`)).text();
    assert.match(privacy, /Acme Repair \("we", "us"\)/);
    assert.match(privacy, /mailto:help@acme\.example/);
    assert.match(privacy, /tel:5125550199/);
    assert.match(terms, /laws of the State of Texas/);
    assert.match(terms, /\$4\.99\/month/);

    // Linked from the app, the guide pages, and the sign-up form.
    const shell = await (await fetch(`${base}/`)).text();
    assert.match(shell, /href="\/privacy"/);
    const guide = await (await fetch(`${base}/guides/dryer`)).text();
    assert.match(guide, /href="\/privacy">Privacy<\/a> · <a href="\/terms">Terms/);
  });
});
