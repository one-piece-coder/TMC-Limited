import express from "express";
import { requireUser } from "./auth.js";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export function startOfMonth(now = new Date()) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

export function scanLimit(user, config) {
  return user.plan === "pro" ? config.proScansPerMonth : config.freeScansPerMonth;
}

export function usageFor(db, user, config) {
  const used = db.countScansSince(user.id, startOfMonth());
  const limit = scanLimit(user, config);
  return { used, limit, remaining: Math.max(0, limit - used) };
}

// Applies a Stripe subscription's state to the matching user.
export function applySubscription(db, subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  const user = customerId && db.userByCustomer(customerId);
  if (!user) return false;
  const plan = ACTIVE_STATUSES.has(subscription.status) ? "pro" : "free";
  db.setPlan(user.id, plan, subscription.status);
  return true;
}

export function createBillingRouter({ db, stripe, config }) {
  const router = express.Router();
  const appUrl = (req) => config.appUrl || `${req.protocol}://${req.get("host")}`;
  const requireStripe = (_req, res, next) =>
    stripe && config.stripePriceId
      ? next()
      : res.status(503).json({ error: "Upgrades aren't available yet.", code: "billing_disabled" });

  router.post("/checkout", requireUser, requireStripe, async (req, res, next) => {
    try {
      let customerId = req.user.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user.email,
          metadata: { userId: String(req.user.id) },
        });
        customerId = customer.id;
        db.setStripeCustomer(req.user.id, customerId);
      }
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        client_reference_id: String(req.user.id),
        line_items: [{ price: config.stripePriceId, quantity: 1 }],
        allow_promotion_codes: true,
        success_url: `${appUrl(req)}/#/account?checkout=success`,
        cancel_url: `${appUrl(req)}/#/account`,
      });
      res.json({ url: session.url });
    } catch (err) {
      next(err);
    }
  });

  router.post("/portal", requireUser, requireStripe, async (req, res, next) => {
    if (!req.user.stripe_customer_id) return res.status(400).json({ error: "No billing account yet." });
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: req.user.stripe_customer_id,
        return_url: `${appUrl(req)}/#/account`,
      });
      res.json({ url: session.url });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

// Mounted with express.raw() so the signature can be checked against the exact bytes.
export function createWebhookHandler({ db, stripe, config }) {
  return async (req, res) => {
    if (!stripe || !config.stripeWebhookSecret) return res.status(503).end();
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], config.stripeWebhookSecret);
    } catch {
      return res.status(400).json({ error: "Invalid signature." });
    }

    try {
      const obj = event.data.object;
      switch (event.type) {
        case "checkout.session.completed": {
          const userId = Number(obj.client_reference_id);
          if (userId && obj.customer && db.userById(userId) && !db.userById(userId).stripe_customer_id) {
            db.setStripeCustomer(userId, obj.customer);
          }
          if (obj.subscription) {
            const subscription = await stripe.subscriptions.retrieve(obj.subscription);
            applySubscription(db, subscription);
          }
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          applySubscription(db, obj);
          break;
        default:
          break;
      }
      res.json({ received: true });
    } catch (err) {
      console.error("Webhook handling failed:", err);
      res.status(500).json({ error: "Webhook handling failed." });
    }
  };
}
