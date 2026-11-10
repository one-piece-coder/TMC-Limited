import crypto from "node:crypto";
import { FALLBACK_RETAILERS } from "../public/data/parts.js";

const int = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

// Retailer search links for parts and tools. Set AMAZON_ASSOCIATE_TAG to earn Amazon
// Associates commission, and/or PARTS_RETAILERS to a JSON array of
// {"name": "...", "template": "https://.../search?q={query}&affid=..."}.
export function buildRetailers(env = process.env) {
  const retailers = [];
  const tag = env.AMAZON_ASSOCIATE_TAG?.trim();
  retailers.push({
    name: "Amazon",
    template: `${FALLBACK_RETAILERS[0].template}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`,
  });
  if (env.PARTS_RETAILERS) {
    let extra;
    try {
      extra = JSON.parse(env.PARTS_RETAILERS);
    } catch {
      throw new Error("PARTS_RETAILERS must be a JSON array of {name, template} objects.");
    }
    for (const r of Array.isArray(extra) ? extra : []) {
      if (typeof r?.name === "string" && /^https:\/\//.test(r?.template) && r.template.includes("{query}")) {
        retailers.push({ name: r.name, template: r.template });
      } else {
        console.warn("Ignoring invalid PARTS_RETAILERS entry:", r);
      }
    }
  }
  return retailers;
}

export function loadConfig(env = process.env) {
  return {
    // RENDER_EXTERNAL_URL is set automatically on Render, so it works before a custom domain is added.
    appUrl: (env.APP_URL || env.RENDER_EXTERNAL_URL || "").replace(/\/$/, ""),
    freeScansPerMonth: int(env.FREE_SCANS_PER_MONTH, 3),
    proScansPerMonth: int(env.PRO_SCANS_PER_MONTH, 100),
    proPriceLabel: env.PRO_PRICE_LABEL || "$4.99/month",
    stripeSecretKey: env.STRIPE_SECRET_KEY || "",
    stripePriceId: env.STRIPE_PRICE_ID || "",
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || "",
    retailers: buildRetailers(env),
    production: env.NODE_ENV === "production",
    smtpUrl: env.SMTP_URL || "",
    emailFrom: env.EMAIL_FROM || "FixIt Home <no-reply@localhost>",
    // One-time code that lets the owner claim the site at /#/setup. If not set, a random
    // one is generated at startup and printed in the server log.
    setupCode: env.SETUP_CODE?.trim() || crypto.randomBytes(6).toString("hex"),
    setupCodeFromEnv: Boolean(env.SETUP_CODE?.trim()),
    trustProxy: env.TRUST_PROXY ? (/^\d+$/.test(env.TRUST_PROXY) ? Number(env.TRUST_PROXY) : env.TRUST_PROXY === "true") : false,
  };
}
