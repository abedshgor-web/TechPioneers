import { Router, Request, Response } from "express";
import Stripe from "stripe";
import db from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

interface UserRow {
  id: string;
  email: string;
  name: string;
  stripe_customer_id: string | null;
  plan: string;
}

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" });
}

// POST /api/subscriptions/checkout
router.post("/checkout", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const stripe = getStripe();
  const frontendUrl = process.env.FRONTEND_URL || "https://techpioneers.onrender.com";

  if (!stripe) {
    res.json({ url: `${frontendUrl}?upgrade=mock` });
    return;
  }

  try {
    const userRow = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as UserRow | undefined;
    if (!userRow) { res.status(404).json({ error: "User not found" }); return; }

    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!priceId) { res.status(500).json({ error: "Stripe price ID not configured" }); return; }

    let customerId = userRow.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userRow.email,
        metadata: { userId: userRow.id },
      });
      customerId = customer.id;
      db.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?").run(customerId, userRow.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${frontendUrl}?upgrade=success`,
      cancel_url: `${frontendUrl}?upgrade=cancelled`,
      metadata: { userId: userRow.id },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// POST /api/subscriptions/webhook
router.post("/webhook", async (req: Request, res: Response): Promise<void> => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) { res.status(400).json({ error: "Stripe not configured" }); return; }

  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") { res.status(400).json({ error: "Missing stripe-signature" }); return; }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook verification failed:", err);
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as { metadata?: { userId?: string } };
      const userId = session.metadata?.userId;
      if (userId) {
        db.prepare("UPDATE users SET plan = 'pro' WHERE id = ?").run(userId);
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as { customer: string | { id: string } };
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      db.prepare("UPDATE users SET plan = 'free' WHERE stripe_customer_id = ?").run(customerId);
    }
    res.json({ received: true });
  } catch (error) {
    console.error("Webhook handling error:", error);
    res.status(500).json({ error: "Webhook handling failed" });
  }
});

// GET /api/subscriptions/status
router.get("/status", requireAuth, (req: AuthRequest, res: Response): void => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const row = db.prepare("SELECT email, plan FROM users WHERE id = ?").get(req.user.id) as Pick<UserRow, "email" | "plan"> | undefined;
  if (!row) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ plan: row.plan, email: row.email });
});

// POST /api/subscriptions/cancel
router.post("/cancel", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (req.user.plan !== "pro") { res.status(403).json({ error: "Only pro users" }); return; }

  const stripe = getStripe();
  if (!stripe) { res.status(400).json({ error: "Stripe not configured" }); return; }

  try {
    const userRow = db.prepare("SELECT stripe_customer_id FROM users WHERE id = ?").get(req.user.id) as Pick<UserRow, "stripe_customer_id"> | undefined;
    if (!userRow?.stripe_customer_id) { res.status(400).json({ error: "No Stripe customer" }); return; }

    const frontendUrl = process.env.FRONTEND_URL || "https://techpioneers.onrender.com";
    const session = await stripe.billingPortal.sessions.create({
      customer: userRow.stripe_customer_id,
      return_url: frontendUrl,
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error("Billing portal error:", error);
    res.status(500).json({ error: "Failed to create billing portal session" });
  }
});

export default router;
