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
    get: (p) => call("GET", p),
    post: (p, b = {}) => call("POST", p, b),
    put: (p, b = {}) => call("PUT", p, b),
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
  const { app } = makeApp({ config: { freeScansPerMonth: 2 } });
  await withServer(app, async (base) => {
    const c = client(base);
    const photo = { image: "aGVsbG8=", mediaType: "image/png" };
    assert.equal((await c.post("/api/identify", photo)).status, 401);

    await c.post("/api/signup", { email: "pat@example.com", password: "password1" });
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

test("serves the app shell for deep links", async () => {
  const { app } = makeApp();
  await withServer(app, async (base) => {
    const page = await fetch(`${base}/repair/dryer/dryer-no-heat`);
    assert.match(await page.text(), /FixIt Home/);
  });
});

// ---------- password reset ----------

function captureMailer() {
  const sent = [];
  return { sent, mailer: { enabled: true, send: async (msg) => sent.push(msg) } };
}
const tick = () => new Promise((r) => setTimeout(r, 20));
const tokenFrom = (msg) => msg.text.match(/#\/reset\?token=([\w-]+)/)[1];

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
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "pat@example.com");
    assert.match(sent[0].text, /^https:\/\/fixit\.example\/#\/reset\?token=/m);
    const token = tokenFrom(sent[0]);

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
    const [first, second] = sent.map(tokenFrom);
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
