import { randomUUID } from "crypto";
import db from "../db";

/**
 * Ads module schema + lightweight migrations + demo "house ads" seed.
 * Reuses the existing better-sqlite3 connection from ../db.
 */

// ── Role column on users (migration; ignored if it already exists) ──
try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
} catch {
  /* column already exists */
}

// ── Tables ──
db.exec(`
  CREATE TABLE IF NOT EXISTS advertisers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    website TEXT,
    status TEXT NOT NULL DEFAULT 'active',      -- active | suspended
    wallet_balance REAL NOT NULL DEFAULT 0,
    is_house INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS ad_campaigns (
    id TEXT PRIMARY KEY,
    advertiser_id TEXT NOT NULL,
    name TEXT NOT NULL,
    objective TEXT NOT NULL DEFAULT 'traffic',       -- awareness | traffic
    pricing_model TEXT NOT NULL DEFAULT 'cpc',        -- cpc | cpm
    bid_amount REAL NOT NULL DEFAULT 0.5,             -- $ per click (cpc) or per 1000 impressions (cpm)
    daily_budget REAL NOT NULL DEFAULT 0,
    total_budget REAL NOT NULL DEFAULT 0,
    spent REAL NOT NULL DEFAULT 0,
    placement TEXT NOT NULL DEFAULT 'dashboard_top_banner',
    targeting TEXT,                                   -- JSON: { locales, plans, countries, interests }
    status TEXT NOT NULL DEFAULT 'draft',             -- draft|pending_review|active|paused|completed|rejected
    review_notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (advertiser_id) REFERENCES advertisers(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS ad_creatives (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'native',            -- native | banner
    headline TEXT NOT NULL,
    body TEXT,
    cta_label TEXT NOT NULL DEFAULT 'Learn More',
    image_url TEXT,
    landing_url TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'en',
    accent TEXT NOT NULL DEFAULT 'blue',              -- blue | emerald | violet | amber
    created_at TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS ad_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,                               -- impression | click
    creative_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    advertiser_id TEXT NOT NULL,
    placement TEXT,
    user_id TEXT,
    cost REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS wallet_ledger (
    id TEXT PRIMARY KEY,
    advertiser_id TEXT NOT NULL,
    type TEXT NOT NULL,                               -- topup | spend | refund
    amount REAL NOT NULL,
    balance_after REAL NOT NULL,
    ref TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (advertiser_id) REFERENCES advertisers(id) ON DELETE CASCADE
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_events_campaign ON ad_events (campaign_id, created_at)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_events_advertiser ON ad_events (advertiser_id, type)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns (status, placement)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_creatives_campaign ON ad_creatives (campaign_id)`);

// ── Seed "house ads": the platform's own promos so slots are never empty ──
// House campaigns bid 0 → they only fill when no paying advertiser wins, and
// cost nothing. They make the experience feel alive from the first load.
function seedHouseAds() {
  const exists = db.prepare("SELECT id FROM advertisers WHERE is_house = 1").get() as { id: string } | undefined;
  if (exists) return;

  const now = new Date().toISOString();
  const houseUserId = `house_user_${randomUUID()}`;
  const advId = `adv_house`;

  // A detached house user row (so FK holds) — not a login account.
  db.prepare(
    "INSERT OR IGNORE INTO users (id, email, password_hash, name, plan, created_at) VALUES (?, ?, ?, ?, 'pro', ?)"
  ).run(houseUserId, `house+${houseUserId}@techpioneers.local`, "-", "TechPioneers", now);

  db.prepare(
    "INSERT INTO advertisers (id, user_id, company_name, website, status, wallet_balance, is_house, created_at) VALUES (?, ?, ?, ?, 'active', 0, 1, ?)"
  ).run(advId, houseUserId, "TechPioneers", "https://techpioneers.onrender.com", now);

  const houseCampaigns: Array<{
    name: string;
    placement: string;
    creative: {
      headline: string; body: string; cta: string; url: string; accent: string; image?: string;
    };
  }> = [
    {
      name: "Upgrade to Pro",
      placement: "dashboard_top_banner",
      creative: {
        headline: "Trade smarter with Pro",
        body: "Unlimited copies, priority signals, and an ad-free experience.",
        cta: "Upgrade",
        url: "https://techpioneers.onrender.com",
        accent: "blue",
      },
    },
    {
      name: "Connect MetaTrader",
      placement: "traders_native_card",
      creative: {
        headline: "Connect MetaTrader in 60s",
        body: "Mirror top traders straight to your MT4 / MT5 account.",
        cta: "Connect",
        url: "https://techpioneers.onrender.com",
        accent: "emerald",
      },
    },
    {
      name: "Trader of the Month",
      placement: "dashboard_top_banner",
      creative: {
        headline: "Meet this month's top trader",
        body: "73% win rate, low drawdown. Start copying in one tap.",
        cta: "Explore",
        url: "https://techpioneers.onrender.com",
        accent: "violet",
      },
    },
  ];

  const insCampaign = db.prepare(`
    INSERT INTO ad_campaigns (id, advertiser_id, name, objective, pricing_model, bid_amount,
      daily_budget, total_budget, spent, placement, targeting, status, created_at)
    VALUES (?, ?, ?, 'awareness', 'cpm', 0, 0, 0, 0, ?, NULL, 'active', ?)
  `);
  const insCreative = db.prepare(`
    INSERT INTO ad_creatives (id, campaign_id, format, headline, body, cta_label, image_url, landing_url, locale, accent, created_at)
    VALUES (?, ?, 'native', ?, ?, ?, ?, ?, 'en', ?, ?)
  `);

  for (const c of houseCampaigns) {
    const campId = `camp_house_${randomUUID()}`;
    insCampaign.run(campId, advId, c.name, c.placement, now);
    insCreative.run(
      `cr_house_${randomUUID()}`, campId,
      c.creative.headline, c.creative.body, c.creative.cta,
      c.creative.image ?? null, c.creative.url, c.creative.accent, now
    );
  }
}

seedHouseAds();

export default db;
