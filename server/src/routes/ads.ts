import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import db from "../ads/schema";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { signEventToken, verifyEventToken } from "../ads/tokens";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
// Auto-approve campaigns on submit (smooth demo flow). In production set
// ADS_AUTO_APPROVE=false to require human moderation of every campaign.
const AUTO_APPROVE = (process.env.ADS_AUTO_APPROVE || "true").toLowerCase() !== "false";

// ── Types ──
interface AdvertiserRow {
  id: string; user_id: string; company_name: string; website: string | null;
  status: string; wallet_balance: number; is_house: number; created_at: string;
}
interface CampaignRow {
  id: string; advertiser_id: string; name: string; objective: string;
  pricing_model: string; bid_amount: number; daily_budget: number;
  total_budget: number; spent: number; placement: string; targeting: string | null;
  status: string; review_notes: string | null; created_at: string;
}
interface CreativeRow {
  id: string; campaign_id: string; format: string; headline: string; body: string | null;
  cta_label: string; image_url: string | null; landing_url: string; locale: string;
  accent: string; created_at: string;
}

// ── Helpers ──
const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
function num(v: unknown, def = 0): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : def;
}
// Accept an https image URL or a small inline data URL; reject anything else.
function sanitizeImage(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  if (/^https:\/\/\S+$/i.test(v)) return v.slice(0, 1000);
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v) && v.length < 700000) return v;
  return null;
}
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" });
}
function getAdvertiserByUser(userId: string): AdvertiserRow | undefined {
  return db.prepare("SELECT * FROM advertisers WHERE user_id = ?").get(userId) as AdvertiserRow | undefined;
}
function requireAdvertiser(req: AuthRequest, res: Response): AdvertiserRow | null {
  const adv = getAdvertiserByUser(req.user!.id);
  if (!adv) { res.status(404).json({ error: "Not an advertiser yet" }); return null; }
  return adv;
}
function userInterests(userId?: string): string[] {
  if (!userId) return [];
  try {
    const rows = db.prepare(
      `SELECT DISTINCT tr.strategy AS s, tr.risk_level AS r
       FROM copy_subscriptions cs JOIN traders tr ON tr.id = cs.trader_id
       WHERE cs.user_id = ? AND cs.status = 'active'`
    ).all(userId) as Array<{ s: string; r: string }>;
    const set = new Set<string>();
    for (const row of rows) { set.add(row.s.toLowerCase()); set.add(row.r.toLowerCase()); }
    return [...set];
  } catch { return []; }
}
function todaySpend(campaignId: string): number {
  const r = db.prepare(
    "SELECT COALESCE(SUM(cost),0) AS s FROM ad_events WHERE campaign_id = ? AND substr(created_at,1,10) = ?"
  ).get(campaignId, today()) as { s: number };
  return r.s;
}

// =====================================================================
// ADVERTISER ACCOUNT
// =====================================================================

// POST /api/ads/advertisers — turn the current user into an advertiser
router.post("/advertisers", requireAuth, (req: AuthRequest, res: Response): void => {
  const { company_name, website } = req.body ?? {};
  const existing = getAdvertiserByUser(req.user!.id);
  if (existing) { res.json({ advertiser: existing }); return; }

  const id = `adv_${randomUUID()}`;
  db.prepare(
    "INSERT INTO advertisers (id, user_id, company_name, website, status, wallet_balance, is_house, created_at) VALUES (?, ?, ?, ?, 'active', 0, 0, ?)"
  ).run(id, req.user!.id, (company_name || "My Company").toString().slice(0, 80), (website || null), nowIso());

  db.prepare("UPDATE users SET role = 'advertiser' WHERE id = ? AND role != 'admin'").run(req.user!.id);

  const u = db.prepare("SELECT id, email, name, plan, role FROM users WHERE id = ?").get(req.user!.id) as
    { id: string; email: string; name: string; plan: string; role: string };
  const token = jwt.sign({ id: u.id, email: u.email, plan: u.plan, role: u.role }, JWT_SECRET, { expiresIn: "7d" });

  res.status(201).json({ advertiser: db.prepare("SELECT * FROM advertisers WHERE id = ?").get(id), token, user: u });
});

// GET /api/ads/advertisers/me — advertiser profile + wallet + recent ledger
router.get("/advertisers/me", requireAuth, requireRole("advertiser", "admin"), (req: AuthRequest, res: Response): void => {
  const adv = requireAdvertiser(req, res); if (!adv) return;
  const ledger = db.prepare("SELECT * FROM wallet_ledger WHERE advertiser_id = ? ORDER BY created_at DESC LIMIT 20").all(adv.id);
  res.json({ advertiser: adv, ledger });
});

// =====================================================================
// WALLET
// =====================================================================

function creditWallet(advId: string, amount: number, ref: string): number {
  const tx = db.transaction(() => {
    const adv = db.prepare("SELECT wallet_balance FROM advertisers WHERE id = ?").get(advId) as { wallet_balance: number };
    const balance = Math.round((adv.wallet_balance + amount) * 100) / 100;
    db.prepare("UPDATE advertisers SET wallet_balance = ? WHERE id = ?").run(balance, advId);
    db.prepare("INSERT INTO wallet_ledger (id, advertiser_id, type, amount, balance_after, ref, created_at) VALUES (?, ?, 'topup', ?, ?, ?, ?)")
      .run(`led_${randomUUID()}`, advId, amount, balance, ref, nowIso());
    return balance;
  });
  return tx();
}

// POST /api/ads/wallet/topup — { amount }
router.post("/wallet/topup", requireAuth, requireRole("advertiser", "admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  const adv = requireAdvertiser(req, res); if (!adv) return;
  const amount = Math.round(num(req.body?.amount) * 100) / 100;
  if (amount <= 0 || amount > 100000) { res.status(400).json({ error: "Amount must be between 1 and 100000" }); return; }

  const stripe = getStripe();
  if (!stripe) {
    // Mock mode: credit instantly so the flow works without Stripe keys.
    const balance = creditWallet(adv.id, amount, "mock_topup");
    res.json({ ok: true, mock: true, balance });
    return;
  }
  try {
    const frontendUrl = process.env.FRONTEND_URL || "https://techpioneers.onrender.com";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: { currency: "usd", product_data: { name: "Ad wallet top-up" }, unit_amount: Math.round(amount * 100) },
        quantity: 1,
      }],
      success_url: `${frontendUrl}?ads_topup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}?ads_topup=cancelled`,
      metadata: { advertiser_id: adv.id, amount: String(amount) },
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Topup error:", err);
    res.status(500).json({ error: "Failed to start checkout" });
  }
});

// GET /api/ads/wallet/confirm?session_id= — credit after Stripe success (idempotent)
router.get("/wallet/confirm", requireAuth, requireRole("advertiser", "admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  const adv = requireAdvertiser(req, res); if (!adv) return;
  const sessionId = String(req.query.session_id || "");
  if (!sessionId) { res.status(400).json({ error: "Missing session_id" }); return; }
  const already = db.prepare("SELECT id FROM wallet_ledger WHERE ref = ?").get(sessionId);
  if (already) { res.json({ ok: true, alreadyCredited: true }); return; }
  const stripe = getStripe();
  if (!stripe) { res.status(400).json({ error: "Stripe not configured" }); return; }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" || session.metadata?.advertiser_id !== adv.id) {
      res.status(400).json({ error: "Payment not completed" }); return;
    }
    const balance = creditWallet(adv.id, num(session.metadata?.amount), sessionId);
    res.json({ ok: true, balance });
  } catch (err) {
    console.error("Confirm error:", err);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

// =====================================================================
// CAMPAIGNS (advertiser)
// =====================================================================

// POST /api/ads/campaigns — create a campaign + its first creative in one call
router.post("/campaigns", requireAuth, requireRole("advertiser", "admin"), (req: AuthRequest, res: Response): void => {
  const adv = requireAdvertiser(req, res); if (!adv) return;
  const b = req.body ?? {};
  const c = b.creative ?? {};

  if (!b.name || !String(b.name).trim()) { res.status(400).json({ error: "Campaign name is required" }); return; }
  if (!c.headline || !String(c.headline).trim()) { res.status(400).json({ error: "Ad headline is required" }); return; }
  if (!c.landing_url || !/^https?:\/\//i.test(String(c.landing_url))) { res.status(400).json({ error: "A valid https landing URL is required" }); return; }

  const pricing = b.pricing_model === "cpm" ? "cpm" : "cpc";
  const placement = ["dashboard_top_banner", "traders_native_card"].includes(b.placement) ? b.placement : "dashboard_top_banner";
  const bid = Math.max(pricing === "cpc" ? 0.05 : 0.5, num(b.bid_amount, pricing === "cpc" ? 0.5 : 5));
  const campId = `camp_${randomUUID()}`;

  db.prepare(`
    INSERT INTO ad_campaigns (id, advertiser_id, name, objective, pricing_model, bid_amount,
      daily_budget, total_budget, spent, placement, targeting, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'draft', ?)
  `).run(
    campId, adv.id, String(b.name).trim().slice(0, 80),
    b.objective === "awareness" ? "awareness" : "traffic", pricing, bid,
    Math.max(0, num(b.daily_budget, 0)), Math.max(0, num(b.total_budget, 0)),
    placement, b.targeting ? JSON.stringify(b.targeting) : null, nowIso()
  );

  db.prepare(`
    INSERT INTO ad_creatives (id, campaign_id, format, headline, body, cta_label, image_url, landing_url, locale, accent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `cr_${randomUUID()}`, campId,
    c.format === "banner" ? "banner" : "native",
    String(c.headline).trim().slice(0, 80),
    c.body ? String(c.body).trim().slice(0, 160) : null,
    (c.cta_label || "Learn More").toString().slice(0, 24),
    sanitizeImage(c.image_url), String(c.landing_url),
    c.locale || "en",
    ["blue", "emerald", "violet", "amber"].includes(c.accent) ? c.accent : "blue",
    nowIso()
  );

  res.status(201).json({ campaign: db.prepare("SELECT * FROM ad_campaigns WHERE id = ?").get(campId) });
});

// GET /api/ads/campaigns — advertiser's campaigns with quick stats
router.get("/campaigns", requireAuth, requireRole("advertiser", "admin"), (req: AuthRequest, res: Response): void => {
  const adv = requireAdvertiser(req, res); if (!adv) return;
  const campaigns = db.prepare("SELECT * FROM ad_campaigns WHERE advertiser_id = ? ORDER BY created_at DESC").all(adv.id) as CampaignRow[];
  const out = campaigns.map((c) => {
    const stat = db.prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type='impression' THEN 1 ELSE 0 END),0) AS impressions,
         COALESCE(SUM(CASE WHEN type='click' THEN 1 ELSE 0 END),0) AS clicks
       FROM ad_events WHERE campaign_id = ?`
    ).get(c.id) as { impressions: number; clicks: number };
    const creative = db.prepare("SELECT * FROM ad_creatives WHERE campaign_id = ? LIMIT 1").get(c.id) as CreativeRow | undefined;
    return { ...c, ...stat, ctr: stat.impressions ? stat.clicks / stat.impressions : 0, creative };
  });
  res.json({ campaigns: out });
});

// POST /api/ads/campaigns/:id/submit — send for review (or auto-approve)
router.post("/campaigns/:id/submit", requireAuth, requireRole("advertiser", "admin"), (req: AuthRequest, res: Response): void => {
  const adv = requireAdvertiser(req, res); if (!adv) return;
  const camp = db.prepare("SELECT * FROM ad_campaigns WHERE id = ? AND advertiser_id = ?").get(req.params.id, adv.id) as CampaignRow | undefined;
  if (!camp) { res.status(404).json({ error: "Campaign not found" }); return; }
  if (!["draft", "rejected", "paused"].includes(camp.status)) { res.status(400).json({ error: `Cannot submit a ${camp.status} campaign` }); return; }
  if (adv.wallet_balance <= 0) { res.status(400).json({ error: "Top up your wallet before going live" }); return; }
  const hasCreative = db.prepare("SELECT id FROM ad_creatives WHERE campaign_id = ?").get(camp.id);
  if (!hasCreative) { res.status(400).json({ error: "Add at least one ad before submitting" }); return; }

  const status = AUTO_APPROVE ? "active" : "pending_review";
  db.prepare("UPDATE ad_campaigns SET status = ?, review_notes = NULL WHERE id = ?").run(status, camp.id);
  res.json({ status, autoApproved: AUTO_APPROVE });
});

// PATCH /api/ads/campaigns/:id — { action: 'pause' | 'resume' }
router.patch("/campaigns/:id", requireAuth, requireRole("advertiser", "admin"), (req: AuthRequest, res: Response): void => {
  const adv = requireAdvertiser(req, res); if (!adv) return;
  const camp = db.prepare("SELECT * FROM ad_campaigns WHERE id = ? AND advertiser_id = ?").get(req.params.id, adv.id) as CampaignRow | undefined;
  if (!camp) { res.status(404).json({ error: "Campaign not found" }); return; }
  const action = req.body?.action;
  if (action === "pause" && camp.status === "active") {
    db.prepare("UPDATE ad_campaigns SET status = 'paused' WHERE id = ?").run(camp.id);
  } else if (action === "resume" && camp.status === "paused") {
    db.prepare("UPDATE ad_campaigns SET status = 'active' WHERE id = ?").run(camp.id);
  } else {
    res.status(400).json({ error: "Invalid action for current status" }); return;
  }
  res.json({ status: action === "pause" ? "paused" : "active" });
});

// GET /api/ads/reports — per-campaign performance for the advertiser
router.get("/reports", requireAuth, requireRole("advertiser", "admin"), (req: AuthRequest, res: Response): void => {
  const adv = requireAdvertiser(req, res); if (!adv) return;
  const rows = db.prepare(
    `SELECT c.id, c.name, c.status, c.pricing_model, c.bid_amount, c.total_budget, c.spent,
        COALESCE(SUM(CASE WHEN e.type='impression' THEN 1 ELSE 0 END),0) AS impressions,
        COALESCE(SUM(CASE WHEN e.type='click' THEN 1 ELSE 0 END),0) AS clicks
     FROM ad_campaigns c LEFT JOIN ad_events e ON e.campaign_id = c.id
     WHERE c.advertiser_id = ? GROUP BY c.id ORDER BY c.created_at DESC`
  ).all(adv.id) as Array<CampaignRow & { impressions: number; clicks: number }>;

  const campaigns = rows.map((r) => ({
    id: r.id, name: r.name, status: r.status, pricing_model: r.pricing_model,
    impressions: r.impressions, clicks: r.clicks, spent: Math.round(r.spent * 100) / 100,
    ctr: r.impressions ? r.clicks / r.impressions : 0,
    cpc: r.clicks ? r.spent / r.clicks : 0,
  }));
  const totals = campaigns.reduce((a, c) => ({
    impressions: a.impressions + c.impressions, clicks: a.clicks + c.clicks,
    spent: Math.round((a.spent + c.spent) * 100) / 100,
  }), { impressions: 0, clicks: 0, spent: 0 });
  res.json({ campaigns, totals, wallet_balance: adv.wallet_balance });
});

// =====================================================================
// DELIVERY (ad server) — public
// =====================================================================

function optionalUserId(req: Request): string | undefined {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return undefined;
  try { return (jwt.verify(h.slice(7), JWT_SECRET) as { id: string }).id; } catch { return undefined; }
}

function matchesTargeting(targeting: string | null, ctx: { locale: string; plan: string; country?: string; interests: string[] }): boolean {
  if (!targeting) return true;
  let t: { locales?: string[]; plans?: string[]; countries?: string[]; interests?: string[] };
  try { t = JSON.parse(targeting); } catch { return true; }
  if (t.locales?.length && !t.locales.includes(ctx.locale)) return false;
  if (t.plans?.length && !t.plans.includes(ctx.plan)) return false;
  if (t.countries?.length && ctx.country && !t.countries.includes(ctx.country)) return false;
  if (t.interests?.length && !t.interests.some((i) => ctx.interests.includes(i.toLowerCase()))) return false;
  return true;
}

// GET /api/ads/serve?placement=&locale=&plan=&country=
router.get("/serve", (req: Request, res: Response): void => {
  const placement = String(req.query.placement || "");
  if (!placement) { res.status(400).json({ error: "placement is required" }); return; }
  const ctx = {
    locale: String(req.query.locale || "en"),
    plan: String(req.query.plan || "free"),
    country: req.query.country ? String(req.query.country) : undefined,
    interests: userInterests(optionalUserId(req)),
  };

  const candidates = db.prepare(
    "SELECT * FROM ad_campaigns WHERE status = 'active' AND placement = ?"
  ).all(placement) as CampaignRow[];

  const eligible = candidates.filter((c) => {
    if (c.total_budget > 0 && c.spent >= c.total_budget) return false;
    if (c.daily_budget > 0 && todaySpend(c.id) >= c.daily_budget) return false;
    return matchesTargeting(c.targeting, ctx);
  });
  if (eligible.length === 0) { res.status(204).end(); return; }

  // Rank by eCPM (cpm bid directly; cpc bid × assumed CTR × 1000).
  const ASSUMED_CTR = 0.02;
  const ranked = eligible
    .map((c) => ({ c, ecpm: c.pricing_model === "cpm" ? c.bid_amount : c.bid_amount * ASSUMED_CTR * 1000 }))
    .sort((a, b) => b.ecpm - a.ecpm || Math.random() - 0.5);
  const winner = ranked[0].c;

  // Pick a creative matching locale, fall back to en, then any.
  const creatives = db.prepare("SELECT * FROM ad_creatives WHERE campaign_id = ?").all(winner.id) as CreativeRow[];
  const creative = creatives.find((cr) => cr.locale === ctx.locale) || creatives.find((cr) => cr.locale === "en") || creatives[0];
  if (!creative) { res.status(204).end(); return; }

  const adv = db.prepare("SELECT company_name FROM advertisers WHERE id = ?").get(winner.advertiser_id) as { company_name: string };

  res.json({
    creativeId: creative.id,
    campaignId: winner.id,
    format: creative.format,
    headline: creative.headline,
    body: creative.body,
    ctaLabel: creative.cta_label,
    imageUrl: creative.image_url,
    landingUrl: creative.landing_url,
    accent: creative.accent,
    advertiser: adv?.company_name || "Sponsored",
    impressionToken: signEventToken({ cid: creative.id, campid: winner.id, advid: winner.advertiser_id, plc: placement, kind: "impression" }),
    clickToken: signEventToken({ cid: creative.id, campid: winner.id, advid: winner.advertiser_id, plc: placement, kind: "click" }),
  });
});

// POST /api/ads/events — { type, token }
router.post("/events", (req: Request, res: Response): void => {
  const { type, token } = req.body ?? {};
  if (type !== "impression" && type !== "click") { res.status(400).json({ error: "Invalid type" }); return; }
  const payload = verifyEventToken(String(token || ""));
  if (!payload || payload.kind !== type) { res.status(400).json({ error: "Invalid token" }); return; }

  const camp = db.prepare("SELECT * FROM ad_campaigns WHERE id = ?").get(payload.campid) as CampaignRow | undefined;
  if (!camp || camp.status !== "active") { res.json({ ok: true, ignored: true }); return; }

  const userId = optionalUserId(req);
  // Light dedup: ignore identical event from same user within 60s.
  if (userId) {
    const dup = db.prepare(
      "SELECT id FROM ad_events WHERE type = ? AND creative_id = ? AND user_id = ? AND created_at > ?"
    ).get(type, payload.cid, userId, new Date(Date.now() - 60000).toISOString());
    if (dup) { res.json({ ok: true, deduped: true }); return; }
  }

  // Cost is computed server-side from the campaign, never from the client.
  let cost = 0;
  if (type === "impression" && camp.pricing_model === "cpm") cost = camp.bid_amount / 1000;
  if (type === "click" && camp.pricing_model === "cpc") cost = camp.bid_amount;
  cost = Math.round(cost * 10000) / 10000;

  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO ad_events (id, type, creative_id, campaign_id, advertiser_id, placement, user_id, cost, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(`ev_${randomUUID()}`, type, payload.cid, payload.campid, payload.advid, payload.plc, userId || null, cost, nowIso());

    if (cost > 0) {
      const adv = db.prepare("SELECT wallet_balance, is_house FROM advertisers WHERE id = ?").get(payload.advid) as { wallet_balance: number; is_house: number };
      if (!adv.is_house) {
        const balance = Math.round((adv.wallet_balance - cost) * 100) / 100;
        db.prepare("UPDATE advertisers SET wallet_balance = ? WHERE id = ?").run(Math.max(0, balance), payload.advid);
        db.prepare("UPDATE ad_campaigns SET spent = spent + ? WHERE id = ?").run(cost, payload.campid);
        db.prepare("INSERT INTO wallet_ledger (id, advertiser_id, type, amount, balance_after, ref, created_at) VALUES (?, ?, 'spend', ?, ?, ?, ?)")
          .run(`led_${randomUUID()}`, payload.advid, -cost, Math.max(0, balance), payload.campid, nowIso());

        const fresh = db.prepare("SELECT spent, total_budget FROM ad_campaigns WHERE id = ?").get(payload.campid) as { spent: number; total_budget: number };
        if (balance <= 0) db.prepare("UPDATE ad_campaigns SET status = 'paused' WHERE id = ?").run(payload.campid);
        else if (fresh.total_budget > 0 && fresh.spent >= fresh.total_budget) db.prepare("UPDATE ad_campaigns SET status = 'completed' WHERE id = ?").run(payload.campid);
      }
    }
  });
  tx();
  res.json({ ok: true });
});

// =====================================================================
// ADMIN — moderation + revenue
// =====================================================================

router.get("/admin/moderation", requireAuth, requireRole("admin"), (req: AuthRequest, res: Response): void => {
  const status = String(req.query.status || "pending_review");
  const rows = db.prepare(
    `SELECT c.*, a.company_name AS advertiser_name FROM ad_campaigns c
     JOIN advertisers a ON a.id = c.advertiser_id
     WHERE c.status = ? AND a.is_house = 0 ORDER BY c.created_at DESC`
  ).all(status) as Array<CampaignRow & { advertiser_name: string }>;
  const out = rows.map((c) => ({ ...c, creatives: db.prepare("SELECT * FROM ad_creatives WHERE campaign_id = ?").all(c.id) }));
  res.json({ campaigns: out });
});

router.post("/admin/campaigns/:id/approve", requireAuth, requireRole("admin"), (req: AuthRequest, res: Response): void => {
  const camp = db.prepare("SELECT * FROM ad_campaigns WHERE id = ?").get(req.params.id) as CampaignRow | undefined;
  if (!camp) { res.status(404).json({ error: "Campaign not found" }); return; }
  db.prepare("UPDATE ad_campaigns SET status = 'active', review_notes = NULL WHERE id = ?").run(camp.id);
  res.json({ status: "active" });
});

router.post("/admin/campaigns/:id/reject", requireAuth, requireRole("admin"), (req: AuthRequest, res: Response): void => {
  const camp = db.prepare("SELECT * FROM ad_campaigns WHERE id = ?").get(req.params.id) as CampaignRow | undefined;
  if (!camp) { res.status(404).json({ error: "Campaign not found" }); return; }
  const reason = (req.body?.reason || "Does not meet ad policy").toString().slice(0, 240);
  db.prepare("UPDATE ad_campaigns SET status = 'rejected', review_notes = ? WHERE id = ?").run(reason, camp.id);
  res.json({ status: "rejected" });
});

router.get("/admin/revenue", requireAuth, requireRole("admin"), (_req: AuthRequest, res: Response): void => {
  const totals = db.prepare(
    `SELECT
        COALESCE(SUM(CASE WHEN type='impression' THEN 1 ELSE 0 END),0) AS impressions,
        COALESCE(SUM(CASE WHEN type='click' THEN 1 ELSE 0 END),0) AS clicks,
        COALESCE(SUM(cost),0) AS revenue
     FROM ad_events`
  ).get() as { impressions: number; clicks: number; revenue: number };

  const advertisers = db.prepare("SELECT COUNT(*) AS c FROM advertisers WHERE is_house = 0").get() as { c: number };
  const activeCampaigns = db.prepare("SELECT COUNT(*) AS c FROM ad_campaigns WHERE status = 'active'").get() as { c: number };
  const pending = db.prepare(
    "SELECT COUNT(*) AS c FROM ad_campaigns c JOIN advertisers a ON a.id=c.advertiser_id WHERE c.status='pending_review' AND a.is_house=0"
  ).get() as { c: number };

  const topCampaigns = db.prepare(
    `SELECT c.name, a.company_name AS advertiser, COALESCE(SUM(e.cost),0) AS revenue
     FROM ad_campaigns c JOIN advertisers a ON a.id=c.advertiser_id
     LEFT JOIN ad_events e ON e.campaign_id=c.id
     WHERE a.is_house=0 GROUP BY c.id ORDER BY revenue DESC LIMIT 5`
  ).all() as Array<{ name: string; advertiser: string; revenue: number }>;

  res.json({
    revenue: Math.round(totals.revenue * 100) / 100,
    impressions: totals.impressions,
    clicks: totals.clicks,
    ecpm: totals.impressions ? Math.round((totals.revenue / totals.impressions) * 1000 * 100) / 100 : 0,
    advertisers: advertisers.c,
    activeCampaigns: activeCampaigns.c,
    pendingReview: pending.c,
    topCampaigns,
  });
});

export default router;
