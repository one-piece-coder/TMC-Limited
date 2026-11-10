import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import express from "express";
import { hashPassword, requireUser, startSession, validateCredentials, verifyPassword } from "./auth.js";
import { startOfMonth } from "./billing.js";
import { loadSettings, validateSettings } from "./business.js";
import { LEAD_STATUSES, describeLead, leadsToCsv } from "./leads.js";

// Rough Claude cost per photo scan, for the dashboard estimate only.
const EST_COST_PER_SCAN = 0.07;

export function requireOwner(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Please sign in first.", code: "auth_required" });
  if (req.user.role !== "owner") return res.status(403).json({ error: "Only the business owner can do that." });
  next();
}

const sameSecret = (a, b) => {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

// What's connected and what's left to do, in plain language for the owner.
export function setupChecklist({ config, settings, aiEnabled, billingEnabled, resetEnabled }) {
  return [
    {
      id: "profile",
      label: "Business details",
      done: Boolean(settings.phone && settings.serviceArea),
      help: "Add your phone number and service area in Business settings so customers can reach you.",
    },
    {
      id: "appUrl",
      label: "Your web address",
      done: Boolean(config.appUrl),
      help: "Set APP_URL to your domain (e.g. https://yourbusiness.com). Search listings and emails use it.",
    },
    {
      id: "email",
      label: "Email sending",
      done: Boolean(config.smtpUrl),
      help: "Set SMTP_URL and EMAIL_FROM so you're emailed about new jobs and customers can reset passwords.",
    },
    {
      id: "ai",
      label: "Photo identification",
      done: aiEnabled,
      help: "Set ANTHROPIC_API_KEY so customers can identify appliances from a photo.",
    },
    {
      id: "billing",
      label: "Pro subscriptions (Stripe)",
      done: billingEnabled && Boolean(config.stripeWebhookSecret),
      help: "Set STRIPE_SECRET_KEY, STRIPE_PRICE_ID and STRIPE_WEBHOOK_SECRET to sell Pro memberships.",
    },
    {
      id: "affiliate",
      label: "Parts commissions",
      done: config.retailers.some((r) => /[?&]tag=/.test(r.template)) || config.retailers.length > 1,
      help: "Set AMAZON_ASSOCIATE_TAG (and optionally PARTS_RETAILERS) to earn commission on parts.",
      optional: true,
    },
    {
      id: "reset",
      label: "Password reset",
      done: resetEnabled && Boolean(config.smtpUrl),
      help: "Turns on once email sending and your web address are set.",
    },
  ];
}

export function createAdminRouter({ db, config, isAiConfigured, billingEnabled, resetEnabled, onSettingsChanged, authLimiter }) {
  const router = express.Router();

  // ---- first-time setup: claim the site with the setup code ----
  router.post("/setup", authLimiter, async (req, res, next) => {
    if (db.ownerCount() > 0) return res.status(409).json({ error: "This site already has an owner. Sign in instead." });
    if (!config.setupCode || !sameSecret(req.body?.code ?? "", config.setupCode)) {
      return res.status(403).json({ error: "That setup code isn't right. Check your server's settings or logs." });
    }
    const creds = validateCredentials(req.body);
    if (creds.error) return res.status(400).json({ error: creds.error });
    try {
      let user = db.userByEmail(creds.email);
      if (user) {
        if (!(await verifyPassword(creds.password, user.password_hash))) {
          return res.status(401).json({ error: "That email already has an account. Enter its password to make it the owner." });
        }
      } else {
        user = db.createUser(creds.email, await hashPassword(creds.password));
      }
      db.setRole(user.id, "owner");
      startSession(db, res, user.id);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.use("/admin", requireUser, requireOwner);

  router.get("/admin/overview", (_req, res) => {
    const settings = loadSettings(db);
    const stats = db.stats(startOfMonth());
    res.json({
      stats: { ...stats, estimatedAiCostThisMonth: Math.round(stats.scansThisMonth * EST_COST_PER_SCAN * 100) / 100 },
      checklist: setupChecklist({ config, settings, aiEnabled: isAiConfigured(), billingEnabled, resetEnabled }),
    });
  });

  router.get("/admin/settings", (_req, res) => res.json({ settings: loadSettings(db) }));

  router.put("/admin/settings", (req, res) => {
    const { values, error } = validateSettings(req.body);
    if (error) return res.status(400).json({ error });
    db.saveSettings(values);
    onSettingsChanged();
    res.json({ settings: loadSettings(db) });
  });

  router.get("/admin/leads", (req, res) => {
    const status = LEAD_STATUSES.includes(req.query.status) ? req.query.status : undefined;
    res.json({ leads: db.listLeads({ status }).map((l) => ({ ...l, ...describeLead(l) })), statuses: LEAD_STATUSES });
  });

  router.patch("/admin/leads/:id", (req, res) => {
    const lead = db.leadById(Number(req.params.id));
    if (!lead) return res.status(404).json({ error: "Request not found." });
    const status = req.body?.status ?? lead.status;
    if (!LEAD_STATUSES.includes(status)) return res.status(400).json({ error: "Unknown status." });
    const notes = typeof req.body?.notes === "string" ? req.body.notes.slice(0, 2000) : lead.notes;
    db.updateLead(lead.id, { status, notes });
    const updated = db.leadById(lead.id);
    res.json({ lead: { ...updated, ...describeLead(updated) } });
  });

  router.get("/admin/leads.csv", (_req, res) => {
    const date = new Date().toISOString().slice(0, 10);
    res
      .type("text/csv")
      .set("Content-Disposition", `attachment; filename="service-requests-${date}.csv"`)
      .set("Cache-Control", "no-store")
      .send(leadsToCsv(db.listLeads({ limit: 100000 })));
  });

  // A complete copy of the database (members, job requests, settings) as one file.
  router.get("/admin/backup", (_req, res, next) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-"));
    const file = path.join(dir, "backup.db");
    try {
      db.raw.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
    } catch (err) {
      fs.rmSync(dir, { recursive: true, force: true });
      return next(err);
    }
    const date = new Date().toISOString().slice(0, 10);
    res.set("Cache-Control", "no-store");
    res.download(file, `site-backup-${date}.db`, () => fs.rmSync(dir, { recursive: true, force: true }));
  });

  return router;
}
