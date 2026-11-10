import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import Stripe from "stripe";
import { aiConfigured, identifyAppliance, InputError, MODEL } from "./identify.js";
import { openDatabase } from "./db.js";
import { loadConfig } from "./config.js";
import { createMailer, passwordResetEmail } from "./email.js";
import {
  endSession,
  hashPassword,
  hashToken,
  newToken,
  validatePassword,
  loadUser,
  requireJson,
  requireUser,
  startSession,
  validateCredentials,
  verifyPassword,
} from "./auth.js";
import { createBillingRouter, createWebhookHandler, usageFor } from "./billing.js";
import { rateLimit } from "./rateLimit.js";
import { createGuidePages, renderNotFoundPage } from "./pages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const RESET_MINUTES = 60;
const PROJECT_KEY = /^[a-z0-9-]{1,60}\/[a-z0-9-]{1,80}$/;

export function createApp({
  db = openDatabase(),
  config = loadConfig(),
  identify = identifyAppliance,
  isAiConfigured = aiConfigured,
  stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null,
  mailer = createMailer(config),
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "DENY");
    next();
  });

  // Stripe webhooks need the raw body for signature checks, so mount before express.json().
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), createWebhookHandler({ db, stripe, config }));

  app.use("/api", rateLimit({ windowMs: 15 * 60_000, max: 600 }));
  app.use("/api", express.json({ limit: "8mb" }), requireJson, loadUser(db));

  const publicUser = (user) =>
    user && {
      email: user.email,
      plan: user.plan,
      hasBilling: Boolean(user.stripe_customer_id),
      usage: usageFor(db, user, config),
    };

  app.get("/api/config", (_req, res) => {
    res.json({
      aiEnabled: isAiConfigured(),
      model: isAiConfigured() ? MODEL : null,
      billingEnabled: Boolean(stripe && config.stripePriceId),
      freeScansPerMonth: config.freeScansPerMonth,
      proScansPerMonth: config.proScansPerMonth,
      proPriceLabel: config.proPriceLabel,
      retailers: config.retailers,
      passwordResetEnabled: resetEnabled,
    });
  });

  // ---------- accounts ----------

  const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    max: 20,
    message: "Too many sign-in attempts. Try again in a few minutes.",
  });

  app.get("/api/me", (req, res) => res.json({ user: publicUser(req.user) }));

  app.post("/api/signup", authLimiter, async (req, res, next) => {
    const creds = validateCredentials(req.body);
    if (creds.error) return res.status(400).json({ error: creds.error });
    try {
      if (db.userByEmail(creds.email)) {
        return res.status(409).json({ error: "An account with that email already exists. Try signing in." });
      }
      const user = db.createUser(creds.email, await hashPassword(creds.password));
      startSession(db, res, user.id);
      res.status(201).json({ user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", authLimiter, async (req, res, next) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    try {
      const user = email ? db.userByEmail(email) : null;
      const ok = await verifyPassword(password, user?.password_hash);
      if (!user || !ok) return res.status(401).json({ error: "Wrong email or password." });
      db.purgeExpiredSessions();
      startSession(db, res, user.id);
      res.json({ user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  });

  // ---------- password reset ----------

  // Always answers the same way so the form can't be used to find out who has an account.
  // In production the link must use APP_URL: building it from the Host header would let an
  // attacker forge the header and get a victim's reset link pointed at their own site.
  const resetEnabled = mailer.enabled && Boolean(config.appUrl || !config.production);
  const FORGOT_REPLY = { ok: true, message: "If that email has an account, we've sent a reset link. Check your inbox." };

  app.post("/api/password/forgot", authLimiter, (req, res) => {
    if (!resetEnabled) return res.status(503).json({ error: "Password reset isn't available yet." });
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const user = email ? db.userByEmail(email) : null;
    if (user) {
      const token = newToken();
      db.createPasswordReset(user.id, hashToken(token), Date.now() + RESET_MINUTES * 60_000);
      const base = config.appUrl || `${req.protocol}://${req.get("host")}`;
      // The token sits after "#", so browsers never send it to servers or in Referer headers.
      const link = `${base}/#/reset?token=${token}`;
      // Not awaited, so response time doesn't reveal whether the account exists.
      Promise.resolve(mailer.send(passwordResetEmail({ to: user.email, link, minutes: RESET_MINUTES }))).catch((err) =>
        console.error("Couldn't send password reset email:", err.message),
      );
    }
    res.json(FORGOT_REPLY);
  });

  app.post("/api/password/reset", authLimiter, async (req, res, next) => {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    const passwordError = validatePassword(req.body?.password);
    if (passwordError) return res.status(400).json({ error: passwordError });
    const userId = token ? db.resetTokenUserId(hashToken(token)) : null;
    if (!userId) {
      return res.status(400).json({ error: "This reset link is invalid or has expired. Request a new one.", code: "bad_token" });
    }
    try {
      db.resetPassword(userId, await hashPassword(req.body.password));
      startSession(db, res, userId);
      res.json({ user: publicUser(db.userById(userId)) });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/logout", (req, res) => {
    endSession(db, req, res);
    res.json({ ok: true });
  });

  // ---------- projects (synced across devices) ----------

  app.get("/api/projects", requireUser, (req, res) => res.json({ projects: db.listProjects(req.user.id) }));

  app.put("/api/projects/:applianceId/:repairId", requireUser, (req, res) => {
    const key = `${req.params.applianceId}/${req.params.repairId}`;
    const done = req.body?.done;
    const updated = Number(req.body?.updated);
    if (!PROJECT_KEY.test(key) || !Array.isArray(done) || done.length > 100 || !done.every(Number.isInteger)) {
      return res.status(400).json({ error: "Invalid project." });
    }
    db.saveProject(
      req.user.id,
      key,
      { applianceId: req.params.applianceId, repairId: req.params.repairId, done },
      Number.isFinite(updated) && updated > 0 ? Math.min(updated, Date.now()) : Date.now(),
    );
    res.json({ ok: true });
  });

  app.delete("/api/projects/:applianceId/:repairId", requireUser, (req, res) => {
    db.deleteProject(req.user.id, `${req.params.applianceId}/${req.params.repairId}`);
    res.json({ ok: true });
  });

  // ---------- billing ----------

  app.use("/api/billing", createBillingRouter({ db, stripe, config }));

  // ---------- photo identification ----------

  const scanLimiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    key: (req) => `user:${req.user.id}`,
    message: "You're scanning very quickly. Wait a minute and try again.",
  });

  app.post("/api/identify", requireUser, scanLimiter, async (req, res) => {
    if (!isAiConfigured()) {
      return res.status(503).json({
        error: "Photo identification isn't set up on this server. Use the guided identifier instead.",
      });
    }
    const usage = usageFor(db, req.user, config);
    if (usage.remaining <= 0) {
      return res.status(402).json({
        error:
          req.user.plan === "pro"
            ? `You've used all ${usage.limit} scans for this month. Your scans reset on the 1st.`
            : `You've used your ${usage.limit} free scans this month. Upgrade to Pro for more.`,
        code: req.user.plan === "pro" ? "quota_exceeded" : "upgrade_required",
        usage,
      });
    }

    // Reserve the scan up front so parallel requests can't exceed the quota; refund on failure.
    const scanId = db.recordScan(req.user.id);
    try {
      const result = await identify(req.body || {});
      res.json({ ...result, usage: usageFor(db, req.user, config) });
    } catch (err) {
      db.refundScan(scanId);
      if (err instanceof InputError) return res.status(400).json({ error: err.message });
      if (err instanceof Anthropic.RateLimitError) {
        return res.status(429).json({ error: "Too many requests right now. Please try again in a minute." });
      }
      if (err instanceof Anthropic.APIError) {
        console.error("Claude API error:", err.status, err.message);
        return res.status(502).json({ error: "The identification service is unavailable. Please try again." });
      }
      console.error(err);
      res.status(500).json({ error: "Something went wrong identifying that photo." });
    }
  });

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));
  // eslint-disable-next-line no-unused-vars
  app.use("/api", (err, _req, res, _next) => {
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON." });
    if (err.type === "entity.too.large") return res.status(413).json({ error: "That photo is too large." });
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  });

  app.use(createGuidePages({ config }));
  app.use(express.static(PUBLIC_DIR));
  // The app itself uses #/ routes, so any other path really doesn't exist. A true 404
  // (rather than serving the app) keeps search engines from indexing junk URLs.
  app.use((req, res) => {
    const origin = config.appUrl || `${req.protocol}://${req.get("host")}`;
    res.status(404).type("html").send(renderNotFoundPage({ origin }));
  });
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  const port = Number(process.env.PORT) || 3000;
  createApp({ config }).listen(port, () => {
    console.log(`FixIt Home running at http://localhost:${port}`);
    if (!aiConfigured()) console.log("ANTHROPIC_API_KEY not set: photo identification disabled, guided mode only.");
    if (!config.stripeSecretKey || !config.stripePriceId) console.log("Stripe not configured: upgrades disabled.");
    if (!config.smtpUrl) {
      console.log(config.production ? "SMTP_URL not set: password reset disabled." : "SMTP_URL not set: reset emails print here.");
    }
    if (config.production && !config.appUrl) console.log("APP_URL not set: password reset disabled.");
  });
}
